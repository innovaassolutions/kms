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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Switch,
  FormHelperText,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud, FiGlobe, FiFile } from "react-icons/fi";

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
  "workshop",
  "knowledge",
];

export default function KMSUploadPage() {
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Web URL state
  const [webUrl, setWebUrl] = useState("");
  const [webTitle, setWebTitle] = useState("");
  const [webDescription, setWebDescription] = useState("");
  const [webTags, setWebTags] = useState<string[]>([]);
  const [webTagInput, setWebTagInput] = useState("");
  const [crawlFrequency, setCrawlFrequency] = useState("24 hours");
  const [maxDepth, setMaxDepth] = useState(3);
  const [respectRobotsTxt, setRespectRobotsTxt] = useState(true);
  const [startCrawlImmediately, setStartCrawlImmediately] = useState(true);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; message: string }>({
    isValid: true,
    message: '',
  });
  
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
      const response = await fetch('api/search');
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

  // Web URL tag functions
  const handleWebTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "," || e.key === "Enter") && webTagInput.trim()) {
      e.preventDefault();
      if (!webTags.includes(webTagInput.trim())) {
        setWebTags([...webTags, webTagInput.trim()]);
      }
      setWebTagInput("");
    }
  };

  const addWebTag = (tag: string) => {
    if (!webTags.includes(tag)) {
      setWebTags([...webTags, tag]);
    }
  };

  const removeWebTag = (tag: string) => {
    setWebTags(webTags.filter((t) => t !== tag));
  };

  // URL validation
  const validateUrl = (url: string) => {
    if (!url) {
      setUrlValidation({ isValid: false, message: 'URL is required' });
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        setUrlValidation({ isValid: false, message: 'Only HTTP and HTTPS URLs are supported' });
        return;
      }
      setUrlValidation({ isValid: true, message: '' });
      
      // Auto-generate title from URL if not set
      if (!webTitle) {
        setWebTitle(parsedUrl.hostname);
      }
    } catch (error) {
      setUrlValidation({ isValid: false, message: 'Invalid URL format' });
    }
  };

  const handleWebUrlChange = (value: string) => {
    setWebUrl(value);
    validateUrl(value);
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

  // Handle web source submission
  const handleWebSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webUrl || !urlValidation.isValid) {
      toast({ 
        title: "Please enter a valid URL", 
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/kms/api/web-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webUrl,
          title: webTitle,
          description: webDescription,
          crawlFrequency,
          maxDepth,
          respectRobotsTxt,
          tags: webTags,
          priority: 7, // High priority for manual additions
          startCrawlImmediately,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Web source added successfully!",
          description: startCrawlImmediately ? "Crawling has started" : "Crawling will start according to schedule",
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        // Reset form
        setWebUrl("");
        setWebTitle("");
        setWebDescription("");
        setWebTags([]);
        setWebTagInput("");
        setCrawlFrequency("24 hours");
        setMaxDepth(3);
        setRespectRobotsTxt(true);
        setStartCrawlImmediately(true);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Failed to add web source",
        description: error instanceof Error ? error.message : 'Unknown error',
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle file submission
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
        const response = await fetch('api/process-documents', {
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


  return (
    <Flex minH="100vh" align="center" justify="center" bg={pageBg}>
      <Box
        w={{ base: "90vw", sm: "500px", md: "600px" }}
        bg={cardBg}
        borderRadius="2xl"
        boxShadow="2xl"
        p={8}
      >
        <Text fontSize="2xl" fontWeight="bold" color={cardText} textAlign="center" mb={8}>
          Add Content to KMS
        </Text>
        
        <Tabs variant="soft-rounded" colorScheme="orange">
          <TabList mb={6} justifyContent="center">
            <Tab>
              <HStack>
                <Icon as={FiFile} />
                <Text>Upload Files</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Icon as={FiGlobe} />
                <Text>Web Sources</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* File Upload Tab */}
            <TabPanel p={0}>
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
                    Upload File
                  </Button>
                </VStack>
              </form>
            </TabPanel>

            {/* Web Source Tab */}
            <TabPanel p={0}>
              <form onSubmit={handleWebSubmit}>
                <VStack spacing={5} align="stretch">
                  <FormControl isRequired isInvalid={!urlValidation.isValid}>
                    <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Website URL</FormLabel>
                    <Input
                      value={webUrl}
                      onChange={(e) => handleWebUrlChange(e.target.value)}
                      placeholder="https://example.com"
                      bg={dropzoneBg}
                      color={cardText}
                      border="none"
                      borderRadius="md"
                      _placeholder={{ color: "gray.400" }}
                      p={6}
                    />
                    {!urlValidation.isValid && (
                      <FormHelperText color="red.400" fontSize="sm">
                        {urlValidation.message}
                      </FormHelperText>
                    )}
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Title</FormLabel>
                    <Input
                      value={webTitle}
                      onChange={(e) => setWebTitle(e.target.value)}
                      placeholder="Source title (auto-generated from URL)"
                      bg={dropzoneBg}
                      color={cardText}
                      border="none"
                      borderRadius="md"
                      _placeholder={{ color: "gray.400" }}
                      p={6}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Description</FormLabel>
                    <Textarea
                      value={webDescription}
                      onChange={(e) => setWebDescription(e.target.value)}
                      placeholder="Optional description of this web source"
                      bg={dropzoneBg}
                      color={cardText}
                      border="none"
                      borderRadius="md"
                      _placeholder={{ color: "gray.400" }}
                      p={6}
                      rows={3}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Tags</FormLabel>
                    <VStack spacing={3} align="stretch">
                      <Select
                        placeholder="Select an existing tag..."
                        value=""
                        onChange={(e) => e.target.value && addWebTag(e.target.value)}
                        bg={dropzoneBg}
                        color={cardText}
                        border="none"
                        borderRadius="md"
                        _placeholder={{ color: "gray.400" }}
                        p={6}
                      >
                        {availableTags.filter(tag => !webTags.includes(tag)).map(tag => (
                          <option key={tag} value={tag} style={{ background: dropzoneBg, color: cardText }}>{tag}</option>
                        ))}
                      </Select>
                      
                      <Input
                        value={webTagInput}
                        onChange={(e) => setWebTagInput(e.target.value)}
                        onKeyDown={handleWebTagKeyDown}
                        placeholder="...or create a new tag (comma or enter)"
                        bg={dropzoneBg}
                        color={cardText}
                        border="none"
                        borderRadius="md"
                        _placeholder={{ color: "gray.400" }}
                        p={6}
                      />
                      
                      {webTags.length > 0 && (
                        <Wrap spacing={2}>
                          {webTags.map((tag) => (
                            <WrapItem key={tag}>
                              <Tag size="md" colorScheme="orange" borderRadius="full">
                                <TagLabel>{tag}</TagLabel>
                                <TagCloseButton onClick={() => removeWebTag(tag)} />
                              </Tag>
                            </WrapItem>
                          ))}
                        </Wrap>
                      )}
                    </VStack>
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Crawl Frequency</FormLabel>
                      <Select
                        value={crawlFrequency}
                        onChange={(e) => setCrawlFrequency(e.target.value)}
                        bg={dropzoneBg}
                        color={cardText}
                        border="none"
                        borderRadius="md"
                        p={6}
                      >
                        <option value="1 hour">Every Hour</option>
                        <option value="6 hours">Every 6 Hours</option>
                        <option value="24 hours">Daily</option>
                        <option value="3 days">Every 3 Days</option>
                        <option value="7 days">Weekly</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel color="gray.400" fontWeight="normal" fontSize="sm" mb={1}>Max Depth</FormLabel>
                      <NumberInput
                        value={maxDepth}
                        onChange={(_, value) => setMaxDepth(value || 3)}
                        min={1}
                        max={10}
                        bg={dropzoneBg}
                        borderRadius="md"
                      >
                        <NumberInputField
                          border="none"
                          color={cardText}
                          _placeholder={{ color: "gray.400" }}
                          p={6}
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  </HStack>

                  <HStack spacing={6} justify="space-between">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel color="gray.400" mb="0" fontSize="sm">Respect robots.txt</FormLabel>
                      <Switch
                        isChecked={respectRobotsTxt}
                        onChange={(e) => setRespectRobotsTxt(e.target.checked)}
                        colorScheme="orange"
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel color="gray.400" mb="0" fontSize="sm">Start crawling now</FormLabel>
                      <Switch
                        isChecked={startCrawlImmediately}
                        onChange={(e) => setStartCrawlImmediately(e.target.checked)}
                        colorScheme="orange"
                      />
                    </FormControl>
                  </HStack>

                  <Button
                    type="submit"
                    bg="#F25C05"
                    color="white"
                    fontWeight="bold"
                    w="100%"
                    borderRadius="md"
                    _hover={{ bg: "#d94e04" }}
                    isLoading={loading}
                    loadingText="Adding Source"
                    fontSize="lg"
                    mt={2}
                    isDisabled={!urlValidation.isValid}
                  >
                    Add Web Source
                  </Button>
                </VStack>
              </form>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Flex>
  );
}
