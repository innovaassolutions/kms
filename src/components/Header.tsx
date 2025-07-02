"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Box, Flex, HStack, IconButton, useColorMode, useColorModeValue,
  Drawer, DrawerBody, DrawerOverlay, DrawerContent, DrawerCloseButton,
  useDisclosure, VStack
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

  return (
    <Box as="nav" bg="#181f2a" px={{ base: 2, md: 8 }} py={0} position="sticky" top={0} zIndex={1000} borderBottom="1px solid #222">
      <Flex h={{ base: "56px", md: "72px" }} align="center" justify="space-between">
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/innovaasLogoOrange.png"
            alt="Innovaas Logo"
            width={48}
            height={48}
            style={{
              objectFit: "contain",
              height: "48px",
              width: "48px",
              marginRight: "0"
            }}
            sizes="48px"
          />
        </Link>

        {/* Desktop Nav */}
        <Flex align="center"></Flex>

        {/* Color Mode Switcher */}
        <Flex align="center">
          <ColorModeSwitcher />
          {/* Hamburger for mobile */}
          <IconButton
            aria-label="Open menu"
            icon={<FiMenu />}
            display={{ base: "inline-flex", md: "none" }}
            onClick={onOpen}
            variant="ghost"
            color={navTextColor}
            ml={2}
          />
        </Flex>
      </Flex>

      {/* Mobile Drawer */}
      <Drawer placement="right" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent bg="#181f2a">
          <DrawerCloseButton color="#fff" />
          <DrawerBody>
            <VStack spacing={4} mt={12}>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "999px",
                    background: pathname === link.href ? 'var(--color-accent)' : 'transparent',
                    color: pathname === link.href ? '#fff' : navTextColor,
                    fontWeight: 700,
                    fontFamily: 'Montserrat, Arial, sans-serif',
                    fontSize: "1.1rem",
                    textDecoration: "none",
                    width: "100%",
                    textAlign: "center"
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
} 
