import React, { useState } from 'react';
import styled from 'styled-components';
import { FaHeart, FaStrava } from 'react-icons/fa';

const HeaderContainer = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: bold;
  
  svg {
    color: #fc4c02;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.9;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$connected ? '#4caf50' : '#f44336'};
`;

const DonateButton = styled.button`
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(238, 90, 36, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(238, 90, 36, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    animation: ${props => props.$isHovered ? 'pulse 1s infinite' : 'none'};
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const Header = ({ onDonate, isConnected }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <HeaderContainer>
      <Logo>
        <FaStrava size={24} />
        <Title>Route Optimizer</Title>
      </Logo>
      
      <HeaderActions>
        <ConnectionStatus>
          <StatusDot $connected={isConnected} />
          <span>
            {isConnected ? 'Connected to Strava' : 'Not connected'}
          </span>
        </ConnectionStatus>
        
        <DonateButton
          onClick={onDonate}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          $isHovered={isHovered}
        >
          <FaHeart />
          Support Us
        </DonateButton>
      </HeaderActions>
    </HeaderContainer>
  );
};

export default Header; 