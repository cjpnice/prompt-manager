import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { ProjectDetail } from './pages/ProjectDetail';
import { VersionDetail } from './pages/VersionDetail';
import { TestPrompt } from './pages/TestPrompt';
import TagManagement from './pages/TagManagement';
import CategoryManagement from './pages/CategoryManagement';
import ImportExport from './pages/ImportExport';
import IntegrationTutorial from './pages/IntegrationTutorial';
import Settings from './pages/Settings';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/version/:id" element={<VersionDetail />} />
          <Route path="/test-prompt/:id" element={<TestPrompt />} />
          <Route path="/tags" element={<TagManagement />} />
          <Route path="/categories" element={<CategoryManagement />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="/tutorial" element={<IntegrationTutorial />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
