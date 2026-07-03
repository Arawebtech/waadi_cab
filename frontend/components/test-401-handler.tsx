"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, TestTube } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { authenticatedFetch } from '@/lib/api'
import { base_url } from '../environment'

/**
 * Test component to verify 401 error handling
 * This component is for development/testing purposes only
 * Remove this in production
 */
export function Test401Handler() {
  const { toast } = useToast()

  const test401WithApiRequest = async () => {
    try {
      toast({
        title: "Testing 401 Handler",
        description: "Making API request with potentially expired token...",
      })
      
      // Make request to a protected endpoint that might return 401
      const response = await authenticatedFetch(`${base_url}/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer invalid_token_for_testing`
        }
      })
      
      if (response.ok) {
        toast({
          title: "Request Successful",
          description: "No 401 error occurred",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('Test 401 error:', error)
    }
  }

  const test401WithInvalidToken = async () => {
    try {
      toast({
        title: "Testing 401 Handler",
        description: "Testing with completely invalid token...",
      })
      
      // Make request with obviously invalid token
      const response = await authenticatedFetch(`${base_url}/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer definitely_invalid_token_12345`
        }
      })
      
      if (response.ok) {
        toast({
          title: "Unexpected Success",
          description: "Request succeeded despite invalid token",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('Test 401 error:', error)
    }
  }

  const clearTokensManually = () => {
    localStorage.removeItem('wadi_cab_access_token')
    localStorage.removeItem('wadi_cab_refresh_token')
    localStorage.removeItem('wadi_cab_user_data')
    
    toast({
      title: "Tokens Cleared",
      description: "Manually cleared all authentication tokens",
      variant: "default",
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          401 Error Handler Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Development Tool</p>
              <p>Use these buttons to test 401 error handling. Remove this component in production.</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={test401WithApiRequest}
            variant="outline"
            className="w-full"
          >
            Test with Profile API
          </Button>
          
          <Button 
            onClick={test401WithInvalidToken}
            variant="outline"
            className="w-full"
          >
            Test with Invalid Token
          </Button>
          
          <Button 
            onClick={clearTokensManually}
            variant="destructive"
            className="w-full"
          >
            Clear Tokens Manually
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Expected behavior:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>401 error triggers automatic token cleanup</li>
            <li>User gets redirected to login page</li>
            <li>Toast notification about session expiry</li>
            <li>Console logs show 401 handling</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default Test401Handler
