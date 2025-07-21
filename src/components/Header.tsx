"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Box, Flex, HStack, IconButton, useColorMode, useColorModeValue,
  Drawer, DrawerBody, DrawerOverlay, DrawerContent, DrawerCloseButton,
  useDisclosure, VStack, Divider
} from "@chakra-ui/react";
import { FiSun, FiMoon, FiMenu } from "react-icons/fi";

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/partners', label: 'Our Partners' },
  { href: '/about', label: 'About Us' },
  { href: '/blog', label: 'Blog' },
  { href: '/login', label: 'Team Login' },
];

function ColorModeSwitcher() {
  const { colorMode, toggleColorMode } = useColorMode();
  const iconColor = useColorModeValue('#fff', '#f3f4f6');
  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === "light" ? <FiMoon /> : <FiSun />}
      onClick={toggleColorMode}
      variant="ghost"
      ml={2}
      color={iconColor}
    />
  );
}

export default function Header() {
  const pathname = usePathname();
  const navTextColor = useColorModeValue('#fff', '#f3f4f6');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const borderColor = useColorModeValue("whiteAlpha.300", "whiteAlpha.300");

  return (
    <Box as="nav" bg="#181f2a" px={{ base: 2, md: 8 }} py={0} position="sticky" top={0} zIndex={1000} borderBottom="1px solid #222">
      <Flex h={{ base: "56px", md: "72px" }} align="center" justify="space-between">
        {/* Logo only, left-aligned */}
        <Box display="flex" alignItems="center">
          <Image
            src="/kms/innovaasLogoorange.png"
            alt="Innovaas Logo"
            width={30}
            height={30}
            style={{ objectFit: "contain", height: "30px", width: "30px", marginRight: "0px" }}
            sizes="30px"
          />
        </Box>
        {/* Color Mode Switcher only, right-aligned */}
        <Flex align="center">
          <ColorModeSwitcher />
        </Flex>
      </Flex>
      {/* Bottom Divider */}
      <Divider borderColor={borderColor} />
    </Box>
  );
} 
