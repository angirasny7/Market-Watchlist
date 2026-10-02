import React from 'react';
import { SimpleDashboard } from '../components/dashboard/SimpleDashboard';
import { PageContainer } from '../components/common';

export const DashboardPage: React.FC = () => {
  return (
    <PageContainer>
      <SimpleDashboard />
    </PageContainer>
  );
};

export default DashboardPage;
