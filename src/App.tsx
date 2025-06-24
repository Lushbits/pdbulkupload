import { Route, Switch } from 'wouter';
import { DocumentationLayout } from './components/layouts/DocumentationLayout';
import { WorkflowAppWithLayout } from './components/WorkflowAppWithLayout';
import { RoadmapPage } from './components/documentation/DocumentationPage';

/**
 * Main App Component
 * 
 * Root router for the Planday Bulk Employee Uploader.
 * Uses Wouter for clean routing between different page types:
 * - / -> Main 7-step workflow app
 * - /roadmap -> Beta documentation and roadmap
 */

function App() {
  return (
    <Switch>
      {/* Main workflow app on root path */}
      <Route path="/">
        <WorkflowAppWithLayout />
      </Route>
      
      {/* Documentation/roadmap page */}
      <Route path="/roadmap">
        <DocumentationLayout>
          <RoadmapPage />
        </DocumentationLayout>
      </Route>
    </Switch>
  );
}

export default App;
