"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import {
  Box,
  VStack,
  IconButton,
  Icon,
  Text,
  useColorModeValue,
  Button,
  Image,
  Flex,
  Tooltip,
} from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight, FiHome, FiUpload, FiSearch, FiBarChart2 } from "react-icons/fi";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Dashboard", href: "/kms", icon: FiHome },
  { label: "Upload", href: "/kms/upload", icon: FiUpload },
  { label: "Search", href: "/kms/search", icon: FiSearch },
  { label: "Status", href: "/kms/status", icon: FiBarChart2 },
];

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const sidebarBg = useColorModeValue("white", "#232b39");
  const activeBg = useColorModeValue("#FFF7F0", "#2d3748");
  const activeColor = "#F25C05";
  const iconColor = useColorModeValue("gray.500", "gray.300");

  return (
    <Box
      as="nav"
      position="fixed"
      left={0}
      top={0}
      h="100vh"
      w={collapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_WIDTH}px`}
      zIndex={1000}
      bg={sidebarBg}
      borderRight="1px solid #eee"
      boxShadow="md"
      transition="width 0.2s"
      display="flex"
      flexDirection="column"
      alignItems={collapsed ? "center" : "stretch"}
      justifyContent="space-between"
    >
      {/* Top: Logo and Nav */}
      <VStack align={collapsed ? "center" : "stretch"} spacing={collapsed ? 6 : 8} w="full" pt={4}>
        {/* Logo */}
        <Box mb={collapsed ? 0 : 4} display="flex" alignItems="center" justifyContent="center">
          <Image src="/android-chrome-512x512.png" alt="Logo" boxSize={collapsed ? "40px" : "48px"} />
          {!collapsed && (
            <Text fontWeight="bold" fontSize="xl" color={activeColor} letterSpacing="wide" ml={2}>
              InnovaasKMS
            </Text>
          )}
        </Box>
        {/* Nav Links */}
        <VStack align={collapsed ? "center" : "stretch"} spacing={1} w="full">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const icon = <Icon as={link.icon} boxSize={6} color={isActive ? activeColor : iconColor} />;
            return (
              <NextLink href={link.href} key={link.href} passHref legacyBehavior>
                <Tooltip label={collapsed ? link.label : undefined} placement="right" openDelay={300}>
                  <Button
                    as="a"
                    leftIcon={icon}
                    justifyContent={collapsed ? "center" : "flex-start"}
                    variant="ghost"
                    fontWeight={isActive ? "bold" : "normal"}
                    color={isActive ? activeColor : iconColor}
                    bg={isActive ? activeBg : "transparent"}
                    _hover={{ bg: activeBg, color: activeColor }}
                    size="lg"
                    borderRadius="md"
                    px={collapsed ? 0 : 4}
                    w={collapsed ? "48px" : "full"}
                    minW={collapsed ? "48px" : undefined}
                  >
                    {!collapsed && link.label}
                  </Button>
                </Tooltip>
              </NextLink>
            );
          })}
        </VStack>
      </VStack>
      {/* Bottom: Collapse/Expand Button */}
      <Box pb={4} display="flex" justifyContent="center">
        <IconButton
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          icon={collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          onClick={() => setCollapsed((c) => !c)}
          colorScheme="orange"
          variant="ghost"
          size="lg"
          borderRadius="full"
        />
      </Box>
    </Box>
  );
} 