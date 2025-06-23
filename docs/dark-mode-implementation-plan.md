# Dark Mode Implementation Plan

## Overview

This document outlines the plan and requirements for implementing dark mode throughout the Planday Bulk Employee Uploader application.

**Last Updated:** December 2024  
**Status:** Not Implemented  
**Estimated Effort:** 4-8 hours

---

## Current State Assessment

### ✅ **Strong Foundation Already in Place**

- **Tailwind CSS** configured with comprehensive color system
- **Well-structured component architecture** with consistent styling patterns  
- **Centralized styling** using Tailwind classes and CSS components
- **Custom CSS variables** in `:root` element ready for theming
- **Semantic color usage** throughout components

### ✅ **Existing Color System**

Our Tailwind configuration includes complete color palettes:
- **Primary colors:** 50-950 shades (`#f0f7ff` to `#082949`)
- **Gray colors:** 50-950 shades (`#f9fafb` to `#030712`) 
- **Success colors:** 50-950 shades
- **Error colors:** 50-950 shades
- **Warning colors:** 50-950 shades

### ❌ **Missing for Dark Mode**

- **No dark mode configuration** in `tailwind.config.js`
- **No dark mode variants** in existing components
- **Hard-coded light colors** throughout the application
- **No theme context or management system**
- **No user preference persistence**

---

## Implementation Requirements

### 1. **Tailwind Configuration** ⏱️ *5 minutes*

**File:** `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // ... existing configuration
    },
  },
  plugins: [],
}
```

### 2. **Theme Management System** ⏱️ *30-60 minutes*

#### A. Create Theme Context

**File:** `src/contexts/ThemeContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) return saved;
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

#### B. Create Theme Toggle Component

**File:** `src/components/ui/ThemeToggle.tsx`

```typescript
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors
                 bg-gray-200 hover:bg-gray-300 
                 dark:bg-gray-700 dark:hover:bg-gray-600
                 text-gray-800 dark:text-gray-200"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};
```

#### C. Update Main App

**File:** `src/main.tsx`

```typescript
// Add ThemeProvider wrapper
import { ThemeProvider } from './contexts/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
```

### 3. **Component Updates** ⏱️ *3-5 hours*

Each component needs dark mode variants added. Here's the systematic approach:

#### A. **Core UI Components** (Priority 1)

**Button Component Updates:**
```typescript
// Example pattern for Button.tsx
const getVariantClasses = (): string => {
  switch (variant) {
    case 'primary':
      return 'btn btn-primary'; // Already handles dark mode through CSS
    case 'secondary':
      return 'btn bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600';
    case 'outline':
      return 'btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800';
    // ... other variants
  }
};
```

**Card Component Updates:**
```typescript
// Example pattern for Card.tsx
const getVariantClasses = (): string => {
  switch (variant) {
    case 'default':
      return 'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700';
    case 'elevated':
      return 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700';
    // ... other variants
  }
};
```

#### B. **Components Requiring Updates**

1. **UI Components** (`src/components/ui/`)
   - `Button.tsx` ✏️
   - `Card.tsx` ✏️
   - `Input.tsx` ✏️
   - `PrivacyModal.tsx` ✏️
   - `CookieModal.tsx` ✏️
   - `VersionModal.tsx` ✏️

2. **Progress Components**
   - `ProgressIndicator.tsx` ✏️

3. **Step Components** (`src/components/*/`)
   - `AuthenticationStep.tsx` ✏️
   - `FileUploadStep.tsx` ✏️
   - `MappingStep.tsx` ✏️
   - `ValidationAndCorrectionStep.tsx` ✏️
   - `DataValidationStep.tsx` ✏️
   - `DataCorrectionStep.tsx` ✏️
   - `FinalPreviewStep.tsx` ✏️
   - `BulkUploadStep.tsx` ✏️
   - `ResultsVerificationStep.tsx` ✏️
   - `BulkCorrectionStep.tsx` ✏️

4. **Main App**
   - `App.tsx` ✏️

### 4. **Custom CSS Updates** ⏱️ *1-2 hours*

**File:** `src/index.css`

#### A. Update Root Variables
```css
@layer base {
  :root {
    /* Light mode colors */
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
  }

  :root.dark {
    /* Dark mode colors */
    --bg-primary: #1f2937;
    --bg-secondary: #111827;
    --text-primary: #f9fafb;
    --text-secondary: #9ca3af;
  }
}
```

#### B. Update Component Classes
```css
@layer components {
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg 
           transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 
           disabled:opacity-50 disabled:cursor-not-allowed
           focus:ring-offset-white dark:focus:ring-offset-gray-800;
  }

  .card {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-md 
           border border-gray-200 dark:border-gray-700 p-6;
  }

  .input {
    @apply block w-full px-3 py-2 
           border border-gray-300 dark:border-gray-600 
           rounded-md shadow-sm 
           placeholder-gray-400 dark:placeholder-gray-500
           bg-white dark:bg-gray-700
           text-gray-900 dark:text-gray-100
           focus:outline-none focus:ring-primary-500 focus:border-primary-500 
           disabled:bg-gray-50 dark:disabled:bg-gray-800 
           disabled:text-gray-500 dark:disabled:text-gray-400;
  }

  /* Update sparkling background */
  .sparkling-background {
    /* Light mode gradient */
    background: linear-gradient(135deg, 
      #e1e5eb 0%,
      #e2e6e4 25%,
      #e3e3e6 50%,
      #e5e3e4 75%,
      #f8fafc 100%
    );
  }

  .dark .sparkling-background {
    /* Dark mode gradient */
    background: linear-gradient(135deg, 
      #1f2937 0%,
      #111827 25%,
      #0f172a 50%,
      #1e293b 75%,
      #334155 100%
    );
  }
}
```

---

## Implementation Approach

### **Phase 1: Foundation** ⏱️ *35-65 minutes*
1. Enable Tailwind dark mode configuration
2. Create theme context and provider
3. Create theme toggle component
4. Update main app with theme provider

### **Phase 2: Core Components** ⏱️ *1-2 hours*
1. Update `Button`, `Card`, `Input` components
2. Update modal components
3. Test core functionality

### **Phase 3: Application Components** ⏱️ *2-4 hours*
1. Update all step components systematically
2. Update `ProgressIndicator`
3. Update `App.tsx` main layout

### **Phase 4: Polish & Testing** ⏱️ *30-60 minutes*
1. Update custom CSS classes
2. Test all components in both themes
3. Verify accessibility (focus states, contrast)
4. Test theme persistence across sessions

---

## Testing Checklist

### **Functionality Tests**
- [ ] Theme toggle works correctly
- [ ] Theme persists across browser sessions
- [ ] System preference detection works
- [ ] All components render correctly in both themes

### **Visual Tests**
- [ ] No color contrast issues (WCAG AA compliance)
- [ ] Focus states visible in both themes
- [ ] Hover states work correctly
- [ ] Loading states visible in both themes
- [ ] Modal overlays work correctly

### **Component-Specific Tests**
- [ ] Progress indicator colors correct
- [ ] Button variants all work
- [ ] Form inputs readable
- [ ] Error/success states visible
- [ ] Background gradients smooth

---

## Future Considerations

### **Enhancements**
- **System theme change detection** (automatic switching)
- **Multiple theme options** (not just light/dark)
- **Per-component theme overrides**
- **Reduced motion preferences**
- **High contrast mode**

### **Accessibility**
- Ensure WCAG 2.1 AA compliance for color contrast
- Test with screen readers in both modes
- Verify keyboard navigation works consistently

---

## Notes

- **Performance:** Theme switching should be instant (no flicker)
- **Persistence:** User preference should survive browser restarts
- **Fallback:** Default to light mode if localStorage is unavailable
- **SSR Consideration:** Not applicable for this SPA, but consider for future
- **Bundle Size:** Theme context adds minimal overhead (~2KB)

---

*This document will be updated as dark mode is implemented. Remove the "Not Implemented" status once complete.* 