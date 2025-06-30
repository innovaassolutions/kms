import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Spinner, Center, Text, VStack } from '@chakra-ui/react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="#F25C05" />
          <Text color="gray.500">Verifying authentication...</Text>
        </VStack>
      </Center>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
