import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaStrava } from 'react-icons/fa';

const AuthOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const AuthCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  
  svg {
    color: #fc4c02;
    font-size: 2rem;
  }
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #333;
`;

const Subtitle = styled.p`
  margin: 0 0 2rem 0;
  color: #666;
  line-height: 1.5;
`;

const AuthButton = styled.button`
  background: linear-gradient(135deg, #fc4c02 0%, #e63946 100%);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 auto;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(252, 76, 2, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(252, 76, 2, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const Features = styled.div`
  margin-top: 2rem;
  text-align: left;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  
  &::before {
    content: "✓";
    color: #4caf50;
    font-weight: bold;
  }
`;

const StravaAuth = ({ onAuth, isLoading }) => {
  const [authUrl, setAuthUrl] = useState(null);

  useEffect(() => {
    // Get Strava authorization URL
    fetch('/api/strava/auth-url')
      .then(response => response.json())
      .then(data => setAuthUrl(data.authUrl))
      .catch(error => console.error('Error getting auth URL:', error));
  }, []);

  const handleAuth = () => {
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  // Check for authorization code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      onAuth(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onAuth]);

  return (
    <AuthOverlay>
      <AuthCard>
        <Logo>
          <FaStrava size={32} />
        </Logo>
        
        <Title>Connect to Strava</Title>
        <Subtitle>
          Connect your Strava account to import your activities and optimize your routes 
          using the Chinese Postman Problem algorithm.
        </Subtitle>

        <AuthButton onClick={handleAuth} disabled={isLoading || !authUrl}>
          {isLoading ? (
            <>
              <LoadingSpinner />
              Connecting...
            </>
          ) : (
            <>
              <FaStrava />
              Connect with Strava
            </>
          )}
        </AuthButton>

        <Features>
          <FeatureItem>Import your existing Strava activities</FeatureItem>
          <FeatureItem>Draw polygons to define optimization areas</FeatureItem>
          <FeatureItem>Find shortest routes covering all roads</FeatureItem>
          <FeatureItem>Export optimized routes as GPX files</FeatureItem>
          <FeatureItem>Automatic road network snapping</FeatureItem>
        </Features>
      </AuthCard>
    </AuthOverlay>
  );
};

export default StravaAuth; 