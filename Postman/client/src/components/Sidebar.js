import React from 'react';
import styled from 'styled-components';
import { FaRoute, FaDownload, FaTrash, FaInfoCircle } from 'react-icons/fa';

const SidebarContainer = styled.div`
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Button = styled.button`
  background: ${props => props.$variant === 'primary' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                       props.$variant === 'success' ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)' :
                       props.$variant === 'danger' ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' :
                       '#f5f5f5'};
  color: ${props => props.$variant ? 'white' : '#333'};
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
  margin-bottom: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatusCard = styled.div`
  background: ${props => props.$status === 'ready' ? '#e8f5e8' : 
                       props.$status === 'warning' ? '#fff3cd' : '#f8d7da'};
  border: 1px solid ${props => props.$status === 'ready' ? '#c3e6cb' : 
                              props.$status === 'warning' ? '#ffeaa7' : '#f5c6cb'};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const StatusText = styled.div`
  color: ${props => props.$status === 'ready' ? '#155724' : 
                   props.$status === 'warning' ? '#856404' : '#721c24'};
  font-size: 0.9rem;
  font-weight: 500;
`;

const RouteInfo = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: #666;
`;

const InfoValue = styled.span`
  font-weight: 600;
  color: #333;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const Sidebar = ({
  selectedPolygon,
  startPoint,
  endPoint,
  optimizedRoute,
  isLoading,
  onOptimize,
  onDownloadGPX,
  onClearRoute
}) => {
  const getStatus = () => {
    if (!selectedPolygon) {
      return { status: 'warning', message: 'Draw a polygon to define your area' };
    }
    if (!startPoint) {
      return { status: 'warning', message: 'Set a start point' };
    }
    if (!endPoint) {
      return { status: 'warning', message: 'Set an end point' };
    }
    return { status: 'ready', message: 'Ready to optimize route' };
  };

  const status = getStatus();

  return (
    <SidebarContainer>
      <Section>
        <SectionTitle>
          <FaRoute />
          Route Optimization
        </SectionTitle>
        
        <StatusCard $status={status.status}>
          <StatusText $status={status.status}>
            {status.message}
          </StatusText>
        </StatusCard>

        <Button
          $variant="primary"
          onClick={onOptimize}
          disabled={status.status !== 'ready' || isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Optimizing...
            </>
          ) : (
            <>
              <FaRoute />
              Optimize Route
            </>
          )}
        </Button>

        {optimizedRoute && (
          <>
            <RouteInfo>
              <InfoRow>
                <InfoLabel>Total Distance:</InfoLabel>
                <InfoValue>{formatDistance(optimizedRoute.totalDistance)}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>New Distance:</InfoLabel>
                <InfoValue>{formatDistance(optimizedRoute.newDistance)}</InfoValue>
              </InfoRow>
            </RouteInfo>

            <Button
              $variant="success"
              onClick={onDownloadGPX}
            >
              <FaDownload />
              Download GPX
            </Button>
          </>
        )}

        <Button
          $variant="danger"
          onClick={onClearRoute}
        >
          <FaTrash />
          Clear Route
        </Button>
      </Section>

      <Section>
        <SectionTitle>
          <FaInfoCircle />
          About
        </SectionTitle>
        
        <div style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#666' }}>
          <p>
            This app uses the Chinese Postman Problem (CPP) algorithm to find the shortest route 
            that covers all roads within your selected area.
          </p>
          <p>
            Your existing Strava activities are shown in orange, and the optimized route will be 
            displayed in blue.
          </p>
          <p>
            Road data is sourced from OpenStreetMap and automatically snapped to ensure connectivity.
          </p>
        </div>
      </Section>
    </SidebarContainer>
  );
};

const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

export default Sidebar; 