"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import {
  Box,
  VStack,
  Icon,
  Divider,
  useColorModeValue,
  Button,
} from "@chakra-ui/react";
import { FiHome, FiUpload, FiSearch, FiBarChart2, FiMessageSquare, FiGlobe } from "react-icons/fi";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Dashboard", href: "/", icon: FiHome },
  { label: "Upload", href: "/upload", icon: FiUpload },
  { label: "Search", href: "/search", icon: FiSearch },
  { label: "Chat", href: "/chat", icon: FiMessageSquare },
  { label: "Web Sources", href: "/web-sources", icon: FiGlobe },
  { label: "Status", href: "/status", icon: FiBarChart2 },
];

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

export default function Sidebar() {
  const [hovered, setHovered] = useState(false);
  const collapsed = !hovered;
  const pathname = usePathname();
  const sidebarBg = "#181f2a";
  const activeBg = "#232b39";
  const activeColor = "#F25C05";
  const iconColor = useColorModeValue("gray.400", "gray.300");
  const borderColor = useColorModeValue("whiteAlpha.300", "whiteAlpha.300");

  return (
    <Box
      as="nav"
      h="100%"
      w={collapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_WIDTH}px`}
      bg={sidebarBg}
      borderRight="1px solid #232b39"
      boxShadow="md"
      transition="width 0.2s"
      display="flex"
      flexDirection="column"
      alignItems={collapsed ? "center" : "stretch"}
      justifyContent="flex-start"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      zIndex={999}
    >
      {/* Top Divider */}
      <Divider borderColor={borderColor} mb={2} />
      {/* Nav Links */}
      <VStack align={collapsed ? "center" : "stretch"} spacing={1} w="full" flex={1}>
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Button
              as={NextLink}
              href={link.href}
              leftIcon={<Icon as={link.icon} boxSize={6} color={isActive ? activeColor : iconColor} />}
              justifyContent={collapsed ? "center" : "flex-start"}
              variant="ghost"
              fontWeight={isActive ? "bold" : "normal"}
              color={isActive ? activeColor : iconColor}
              bg={isActive ? activeBg : "transparent"}
              _hover={{ bg: activeBg, color: activeColor }}
              _groupHover={{ color: activeColor }}
              _active={{ color: activeColor }}
              _focus={{ color: activeColor }}
              size="lg"
              borderRadius="md"
              px={collapsed ? 0 : 4}
              w={collapsed ? "48px" : "full"}
              minW={collapsed ? "48px" : undefined}
              sx={{
                '& .chakra-icon': {
                  color: isActive ? activeColor : iconColor,
                },
                '&:hover .chakra-icon': {
                  color: activeColor,
                },
              }}
              key={link.href}
            >
              {!collapsed && link.label}
            </Button>
          );
        })}
      </VStack>
    </Box>
  );
} 