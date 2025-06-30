import { Button, useToast } from '@chakra-ui/react'
import { signOut } from '@/utils/auth'
import { useState } from 'react'

interface LogoutButtonProps {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  onLogout?: () => void
}

export function LogoutButton({ 
  variant = 'solid', 
  size = 'md', 
  children = 'Logout',
  onLogout 
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      // Call the onLogout callback if provided
      if (onLogout) {
        onLogout()
      }
      
      // Perform the actual logout
      await signOut()
      
      // Show success message (though user will be redirected)
      toast({
        title: 'Logged out successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
      
    } catch (error) {
      console.error('Logout failed:', error)
      
      toast({
        title: 'Logout failed',
        description: 'Please try again or contact support',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      
      // Even if logout fails, redirect to login
      window.location.href = '/login'
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      bg="#F25C05"
      color="#fff"
      borderRadius="full"
      fontWeight="bold"
      px={6}
      variant={variant}
      size={size}
      _hover={{ bg: "#d94e04" }}
      onClick={handleLogout}
      isLoading={isLoading}
      loadingText="Logging out..."
    >
      {children}
    </Button>
  )
} 
