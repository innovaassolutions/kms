"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  Tag,
  HStack,
  Text,
  VStack,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud } from "react-icons/fi";

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const FILE_TYPES = [
  { label: "PDF", value: ".pdf" },
  { label: "Word Document", value: ".docx" },
  { label: "Text File", value: ".txt" },
  { label: "MP3 Audio", value: ".mp3" },
  { label: "WAV Audio", value: ".wav" },
  { label: "MP4 Video", value: ".mp4" },
  { label: "MOV Video", value: ".mov" },
];

const DOC_TYPES = [
  "strategy",
  "meeting",
  "email",
  "sop",
  "idea",
  "audio",
  "video",
];

export default function KMSUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  // Theme-aware colors
  const pageBg = useColorModeValue("gray.50", "#181f2a");
  const cardBg = useColorModeValue("white", "#232b39");
  const cardText = useColorModeValue("gray.800", "white");
  const dropzoneBg = useColorModeValue("gray.100", "#202632");
  const dropzoneBorder = useColorModeValue("#CBD5E1", "#353c4a");
  const dropzoneText = useColorModeValue("gray.700", "gray.200");
  const dropzoneHelper = useColorModeValue("gray.500", "gray.400");

  // Helper to determine if file is audio or video
  const isAudioOrVideo = (fileType: string) => {
    return [".mp3", ".wav", ".mp4", ".mov"].some((ext) => fileType.endsWith(ext));
  };

  // Handle tag input (comma or enter to add)
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "," || e.key === "Enter") && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  // Remove a tag
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Dropzone setup
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !type) {
      toast({ title: "Please fill all required fields.", status: "warning" });
      return;
    }
    setLoading(true);
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // 2. Insert metadata into documents table
      let uploaded_by = null;
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        uploaded_by = userData.user.id;
      }
      // For development, allow uploaded_by to be null (no auth)

      const isAV = isAudioOrVideo(`.${fileExt}`);
      const { error: insertError } = await supabase.from("documents").insert([
        {
          title,
          type,
          tags,
          file_path: uploadData.path,
          uploaded_by,
          media_type: isAV ? (fileExt === "mp3" || fileExt === "wav" ? "audio" : "video") : "text",
          transcription_status: isAV ? "pending" : null,
          created_at: new Date().toISOString(),
        },
      ]);
      if (insertError) throw insertError;

      toast({ title: "File uploaded successfully!", status: "success" });
      setFile(null);
      setTitle("");
      setType("");
      setTags([]);
      setTagInput("");
      // Optionally redirect or refresh
      // router.push("/team/kms");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", description: err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Add this function below handleSubmit
  const handleMinimalInsert = async () => {
    const { error } = await supabase.from("documents").insert([
      { title: "Test from app", type: "idea", tags: ["test"] }
    ]);
    console.log('Minimal insert error:', error);
    if (error) {
      toast({ title: "Minimal insert failed", description: error.message, status: "error" });
    } else {
      toast({ title: "Minimal insert succeeded!", status: "success" });
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg={pageBg}>
      <Box
        w={{ base: "90vw", sm: "400px" }}
        bg={cardBg}
        borderRadius="2xl"
        boxShadow="2xl"
        p={8}
      >
        <Text fontSize="2xl" fontWeight="bold" color={cardText} textAlign="center" mb={8}>
          Upload to KMS
        </Text>
        <form onSubmit={handleSubmit}>
          <VStack spacing={5} align="stretch">
            <FormControl isRequired>
              <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                bg={dropzoneBg}
                color={cardText}
                border="none"
                borderRadius="md"
                _placeholder={{ color: "gray.400" }}
                p={6}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Type</FormLabel>
              <Select
                placeholder="Select type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                bg={dropzoneBg}
                color={cardText}
                border="none"
                borderRadius="md"
                _placeholder={{ color: "gray.400" }}
                p={6}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: dropzoneBg, color: cardText }}>{t}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Tags (comma or enter)</FormLabel>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag and press comma or enter"
                bg={dropzoneBg}
                color={cardText}
                border="none"
                borderRadius="md"
                _placeholder={{ color: "gray.400" }}
                p={6}
              />
              <HStack mt={2} spacing={2}>
                {tags.map((tag) => (
                  <Tag key={tag} size="md" colorScheme="orange" borderRadius="full">
                    <Box as="span" pr={2}>{tag}</Box>
                    <Box as="button" onClick={() => removeTag(tag)} fontWeight="bold">×</Box>
                  </Tag>
                ))}
              </HStack>
            </FormControl>
            {/* Dropzone at the bottom */}
            <FormControl isRequired>
              <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Upload your file</FormLabel>
              <Box
                {...getRootProps()}
                border={`2px dashed ${dropzoneBorder}`}
                borderRadius="md"
                bg={dropzoneBg}
                p={8}
                textAlign="center"
                cursor="pointer"
                transition="border-color 0.2s"
                _hover={{ borderColor: "#F25C05" }}
                mb={2}
              >
                <input {...getInputProps()} />
                <FiUploadCloud size={40} color={dropzoneHelper} style={{ margin: "0 auto" }} />
                <Text fontWeight="bold" mt={2} color={dropzoneText}>
                  {file ? file.name : "Click to upload"}
                </Text>
                <Text color={dropzoneHelper} fontSize="sm">
                  Drag and drop files here
                </Text>
                {isDragActive && (
                  <Text color="#F25C05" fontWeight="bold" mt={2}
                  >Drop the file here ...</Text>
                )}
              </Box>
            </FormControl>
            <Button
              type="submit"
              bg="#F25C05"
              color="white"
              fontWeight="bold"
              w="100%"
              borderRadius="md"
              _hover={{ bg: "#d94e04" }}
              isLoading={loading}
              loadingText="Uploading"
              fontSize="lg"
              mt={2}
            >
              Upload
            </Button>
            <Button
              onClick={handleMinimalInsert}
              bg="#3182ce"
              color="white"
              fontWeight="bold"
              w="100%"
              borderRadius="md"
              _hover={{ bg: "#2563eb" }}
              mt={4}
            >
              Test Minimal Insert
            </Button>
          </VStack>
        </form>
      </Box>
    </Flex>
  );
}
