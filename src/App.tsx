import { Route, Switch } from 'wouter';
import { DocumentationLayout } from './components/layouts/DocumentationLayout';
import { WorkflowAppWithLayout } from './components/WorkflowAppWithLayout';
import { RoadmapPage } from './components/documentation/DocumentationPage';
import { usePlandayApi } from './hooks/usePlandayApi';
import { ValidationService } from './services/mappingService';
import { useEffect } from 'react';

/**
 * Main App Component
 * 
 * Root router for the Planday Bulk Employee Uploader.
 * Uses Wouter for clean routing between different page types:
 * - / -> Main 7-step workflow app
 * - /status -> Beta documentation and status page
 */

function App() {
  const plandayApi = usePlandayApi();
  
  // Expose debugging functions to the global window object for easy access
  useEffect(() => {
    // @ts-ignore - Intentionally adding to window for debugging
    window.debugPlanday = {
      diagnoseFieldInconsistencies: () => ValidationService.diagnoseFieldInconsistencies(),
      getPlandayApi: () => plandayApi,
      getFieldDefinitions: () => plandayApi.fieldDefinitions,
      getRequiredFields: () => ValidationService.getRequiredFields(),
      getCustomFields: () => ValidationService.getCustomFields(),
    };
    
    console.log('🔍 Debugging functions exposed to window.debugPlanday:', {
      diagnoseFieldInconsistencies: 'Check for field inconsistencies',
      getPlandayApi: 'Get the full Planday API hook instance',
      getFieldDefinitions: 'Get raw field definitions from API',
      getRequiredFields: 'Get processed required fields list',
      getCustomFields: 'Get detected custom fields'
    });
    
    return () => {
      // @ts-ignore
      delete window.debugPlanday;
    };
  }, [plandayApi]);

  return (
    <Switch>
      {/* Main workflow app on root path */}
      <Route path="/">
        <WorkflowAppWithLayout />
      </Route>
      
      {/* Documentation/status page */}
      <Route path="/status">
        <DocumentationLayout>
          <RoadmapPage />
        </DocumentationLayout>
      </Route>
    </Switch>
  );
}

export default App;
