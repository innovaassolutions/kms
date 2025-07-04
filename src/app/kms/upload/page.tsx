"use client";

import React, { useState, useEffect } from "react";
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
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
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
  { label: "Markdown", value: ".md" },
  { label: "MP3 Audio", value: ".mp3" },
  { label: "WAV Audio", value: ".wav" },
  { label: "M4A Audio", value: ".m4a" },
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
  "whitepaper",
  "project-plan",
  "project-charter",
];

export default function KMSUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
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

  // Load available tags on component mount
  useEffect(() => {
    loadAvailableTags();
  }, []);

  const loadAvailableTags = async () => {
    try {
      const response = await fetch('/api/search');
      if (response.ok) {
        const data = await response.json();
        const allTags = new Set<string>();
        data.documents.forEach((doc: any) => {
          if (doc.tags && Array.isArray(doc.tags)) {
            doc.tags.forEach((tag: string) => allTags.add(tag));
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  // Helper to determine if file is audio or video
  const isAudioOrVideo = (fileType: string) => {
    return [".mp3", ".wav", ".m4a", ".mp4", ".mov"].some((ext) => fileType.endsWith(ext));
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

  // Add tag from dropdown
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
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
      "text/markdown": [".md"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/mp4": [".m4a"],
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
      const { data: insertData, error: insertError } = await supabase.from("documents").insert([
        {
          title,
          type,
          tags,
          file_path: uploadData.path,
          uploaded_by,
          media_type: isAV ? (fileExt === "mp3" || fileExt === "wav" || fileExt === "m4a" ? "audio" : "video") : "text",
          transcription_status: isAV ? "pending" : null,
          created_at: new Date().toISOString(),
        },
      ]).select('id');
      if (insertError) throw insertError;
      
      const documentId = insertData?.[0]?.id;

      toast({ title: "File uploaded successfully!", status: "success" });
      
      // Trigger document processing using the actual document ID
      try {
        const response = await fetch('/api/process-documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: documentId, // Use the actual document ID from database
            action: 'process_all'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          toast({ title: "Document processing started!", status: "success" });
          console.log('Processing triggered successfully:', result);
        } else {
          const errorText = await response.text();
          console.error('Document processing failed:', errorText);
          toast({ 
            title: "Processing failed to start", 
            description: "Document uploaded but processing couldn't start automatically", 
            status: "warning" 
          });
        }
      } catch (error) {
        console.error('Failed to trigger document processing:', error);
        toast({ 
          title: "Processing failed to start", 
          description: "Document uploaded but processing couldn't start automatically", 
          status: "warning" 
        });
      }

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
              <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Tags</FormLabel>
              <VStack spacing={3} align="stretch">
                {/* Tag selector dropdown */}
                <Select
                  placeholder="Select an existing tag..."
                  value=""
                  onChange={(e) => e.target.value && addTag(e.target.value)}
                  bg={dropzoneBg}
                  color={cardText}
                  border="none"
                  borderRadius="md"
                  _placeholder={{ color: "gray.400" }}
                  p={6}
                >
                  {availableTags.filter(tag => !tags.includes(tag)).map(tag => (
                    <option key={tag} value={tag} style={{ background: dropzoneBg, color: cardText }}>{tag}</option>
                  ))}
                </Select>
                
                {/* Manual tag input */}
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="...or create a new tag (comma or enter)"
                  bg={dropzoneBg}
                  color={cardText}
                  border="none"
                  borderRadius="md"
                  _placeholder={{ color: "gray.400" }}
                  p={6}
                />
                
                {/* Selected tags display */}
                {tags.length > 0 && (
                  <Wrap spacing={2}>
                    {tags.map((tag) => (
                      <WrapItem key={tag}>
                        <Tag size="md" colorScheme="orange" borderRadius="full">
                          <TagLabel>{tag}</TagLabel>
                          <TagCloseButton onClick={() => removeTag(tag)} />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </VStack>
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
