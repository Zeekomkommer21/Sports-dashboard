import React from 'react';
import styled from 'styled-components';
import { FaHeart, FaTimes, FaPaypal, FaCreditCard } from 'react-icons/fa';

const ModalOverlay = styled.div`
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

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f5f5f5;
    color: #333;
  }
`;

const Title = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  svg {
    color: #ff6b6b;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const Subtitle = styled.p`
  margin: 0 0 2rem 0;
  color: #666;
  line-height: 1.5;
`;

const DonationOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DonationOption = styled.button`
  background: ${props => props.selected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa'};
  color: ${props => props.selected ? 'white' : '#333'};
  border: 2px solid ${props => props.selected ? '#667eea' : '#e0e0e0'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  
  &:hover {
    border-color: #667eea;
    transform: translateY(-2px);
  }
`;

const CustomAmount = styled.div`
  margin-bottom: 2rem;
`;

const AmountInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  text-align: center;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const PaymentMethods = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
`;

const PaymentButton = styled.button`
  background: ${props => props.method === 'paypal' ? '#0070ba' : '#4caf50'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
`;

const Message = styled.div`
  background: #e8f5e8;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #155724;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const DonationModal = ({ onClose }) => {
  const [selectedAmount, setSelectedAmount] = React.useState(5);
  const [customAmount, setCustomAmount] = React.useState('');
  const [amount, setAmount] = React.useState(5);

  const handleAmountSelect = (value) => {
    setSelectedAmount(value);
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setAmount(parseFloat(value) || 0);
    }
  };

  const handlePayPalDonate = () => {
    // PayPal donation link (replace with your actual PayPal.me link)
    window.open('https://www.paypal.me/yourusername', '_blank');
  };

  const handleStripeDonate = () => {
    // Stripe donation (you would implement this with Stripe Checkout)
    alert('Stripe donation integration would be implemented here');
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <FaTimes />
        </CloseButton>
        
        <Title>
          <FaHeart />
          Support Route Optimizer
        </Title>
        
        <Subtitle>
          If you find this tool helpful, consider making a donation to support its development 
          and maintenance. Every contribution helps keep this project free and improving!
        </Subtitle>

        <Message>
          <strong>What your donation supports:</strong><br/>
          • Server costs and hosting<br/>
          • API usage fees (Strava, OpenStreetMap)<br/>
          • Feature development and improvements<br/>
          • Bug fixes and maintenance
        </Message>

        <DonationOptions>
          <DonationOption
            selected={selectedAmount === 5 && !customAmount}
            onClick={() => handleAmountSelect(5)}
          >
            $5
          </DonationOption>
          <DonationOption
            selected={selectedAmount === 10 && !customAmount}
            onClick={() => handleAmountSelect(10)}
          >
            $10
          </DonationOption>
          <DonationOption
            selected={selectedAmount === 20 && !customAmount}
            onClick={() => handleAmountSelect(20)}
          >
            $20
          </DonationOption>
          <DonationOption
            selected={selectedAmount === 50 && !customAmount}
            onClick={() => handleAmountSelect(50)}
          >
            $50
          </DonationOption>
        </DonationOptions>

        <CustomAmount>
          <AmountInput
            type="number"
            placeholder="Or enter custom amount"
            value={customAmount}
            onChange={handleCustomAmountChange}
            min="1"
            step="0.01"
          />
        </CustomAmount>

        <PaymentMethods>
          <PaymentButton method="paypal" onClick={handlePayPalDonate}>
            <FaPaypal />
            PayPal
          </PaymentButton>
          <PaymentButton method="stripe" onClick={handleStripeDonate}>
            <FaCreditCard />
            Credit Card
          </PaymentButton>
        </PaymentMethods>

        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          All donations are secure and processed through trusted payment providers.
        </div>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DonationModal; 