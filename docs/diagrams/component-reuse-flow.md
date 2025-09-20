# Component Reuse Flow Diagrams

## Overview
This document illustrates how components are reused across different pages and contexts in the ChartsSimulator application, focusing on the modular chart architecture.

## Component Reuse Architecture

```mermaid
graph TB
    subgraph "Reusable Component Ecosystem"
        A[ChartPanel - Master Component]
        A --> B[Configuration Engine]
        A --> C[Data Management]
        A --> D[UI Integration]
    end

    subgraph "Chart Type Selection"
        E[Chart Type Factory]
        E --> F[CandlestickChart]
        E --> G[ExtremaChart]
        E --> H[CombinedChart]
        E --> I[DashboardChart]
    end

    subgraph "Rendering Pipeline"
        J[UnifiedChart - Orchestrator]
        J --> K[ChartContainer - Canvas]
        K --> L[Renderer System]
        L --> M[AxisRenderer]
        L --> N[CandlestickRenderer]
        L --> O[ExtremaRenderer]
        L --> P[WyckoffPhaseRenderer]
    end

    subgraph "UI Component Library"
        Q[ControlPanel]
        R[StatsBar]
        S[EmptyState]
        T[LoadingSpinner]
        U[ErrorMessage]
    end

    subgraph "Data Layer"
        V[useChartData Hook]
        W[AppStateContext]
        X[API Services]
    end

    B --> E
    F --> J
    G --> J
    H --> J
    I --> J

    A --> Q
    A --> R
    A --> S
    A --> T
    A --> U

    C --> V
    C --> W
    C --> X

    style A fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style J fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style K fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
```

## Page Integration Flow

```mermaid
graph LR
    subgraph "Before Refactoring"
        A1[Candles Page - 132 lines]
        A2[Extrema Page - 107 lines]
        A3[Charts Page - 111 lines]
        A4[Custom Logic Each]
        A5[Duplicate Code]
        A6[Manual Fixes Needed]

        A1 --> A4
        A2 --> A4
        A3 --> A4
        A4 --> A5
        A5 --> A6
    end

    subgraph "After Refactoring"
        B1[Candles Page - 19 lines]
        B2[Extrema Page - 19 lines]
        B3[Charts Page - 19 lines]
        B4[ChartPanel Component]
        B5[Shared Logic]
        B6[Automatic Updates]

        B1 --> B4
        B2 --> B4
        B3 --> B4
        B4 --> B5
        B5 --> B6
    end

    A6 -.-> B1
    A6 -.-> B2
    A6 -.-> B3

    style B4 fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style A4 fill:#ffebee,stroke:#c62828,stroke-width:2px
```

## ChartPanel Configuration Matrix

```mermaid
graph TB
    subgraph "ChartPanel Configuration Options"
        A[chartType Property]
        B[showControls Property]
        C[showStats Property]
        D[showModeToggle Property]
        E[showThemeToggle Property]
    end

    subgraph "Page Configurations"
        F[Candles Page Config]
        G[Extrema Page Config]
        H[Charts Page Config]
        I[Dashboard Mini-Chart Config]
    end

    subgraph "Resulting UI Components"
        J[Full Control Panel]
        K[Stats Display]
        L[Mode Toggle Button]
        M[Theme Toggle Button]
        N[Minimal Dashboard UI]
    end

    A --> F
    A --> G
    A --> H
    A --> I

    F --> |"candlestick, true, true, false, true"| J
    G --> |"extrema, true, true, true, true"| K
    H --> |"combined, true, true, false, true"| L
    I --> |"dashboard, false, false, false, false"| N

    B --> J
    C --> K
    D --> L
    E --> M

    style F fill:#e3f2fd
    style G fill:#f1f8e9
    style H fill:#fff3e0
    style I fill:#fce4ec
```

## Data Flow Through Reusable Components

```mermaid
sequenceDiagram
    participant Page as Page Component
    participant CP as ChartPanel
    participant Hook as useChartData
    participant API as Backend API
    participant UC as UnifiedChart
    participant CC as ChartContainer
    participant Renderer as Renderer System

    Page->>CP: <ChartPanel chartType="extrema" />
    CP->>Hook: Initialize data hook
    CP->>CP: Configure UI based on props

    Note over CP: User clicks "Load Data"
    CP->>Hook: loadData(symbol, date)
    Hook->>API: GET /api/charts?symbol=X&date=Y
    API-->>Hook: Chart data response
    Hook-->>CP: Data state updated

    CP->>UC: <UnifiedChart data={data} />
    UC->>CC: <ChartContainer onRender={renderFunction} />
    CC->>Renderer: Call render functions
    Renderer-->>CC: Canvas drawing complete
    CC-->>UC: Rendering complete
    UC-->>CP: Chart displayed
    CP-->>Page: Complete UI rendered
```

## Renderer System Reuse Pattern

```mermaid
graph TB
    subgraph "Renderer Functions - Pure & Reusable"
        A[renderCandlesticks]
        B[renderHeikinAshi]
        C[renderExtrema]
        D[renderWyckoffPhases]
        E[renderXAxis]
        F[renderYAxis]
        G[renderGrid]
    end

    subgraph "Chart Type Combinations"
        H[CandlestickChart Uses]
        I[ExtremaChart Uses]
        J[CombinedChart Uses]
        K[DashboardChart Uses]
    end

    H --> A
    H --> D
    H --> E
    H --> F
    H --> G

    I --> A
    I --> C
    I --> D
    I --> E
    I --> F
    I --> G

    J --> A
    J --> B
    J --> D
    J --> E
    J --> F
    J --> G

    K --> A
    K --> G

    style A fill:#ffcdd2
    style B fill:#ffcdd2
    style C fill:#c8e6c9
    style D fill:#c8e6c9
    style E fill:#bbdefb
    style F fill:#bbdefb
    style G fill:#bbdefb
```

## Dashboard Integration Pattern

```mermaid
graph TB
    subgraph "Dashboard Page Layout"
        A[Dashboard Container]
        A --> B[Header Controls]
        A --> C[4-Chart Grid]
    end

    subgraph "Chart Grid Implementation"
        C --> D[Chart Slot 1]
        C --> E[Chart Slot 2]
        C --> F[Chart Slot 3]
        C --> G[Chart Slot 4]
    end

    subgraph "ChartPanel Integration"
        H[Minimal ChartPanel Config]
        H --> I[chartType: "dashboard"]
        H --> J[showControls: false]
        H --> K[showStats: false]
        H --> L[reduced size styling]
    end

    subgraph "Reused Components"
        M[Same UnifiedChart]
        M --> N[Same ChartContainer]
        M --> O[Same Renderers]
        M --> P[Optimized for small size]
    end

    D --> H
    E --> H
    F --> H
    G --> H

    H --> M

    style H fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style M fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

## Component Reuse Benefits

### 1. **Code Reduction Statistics**
```
Before → After (Lines of Code)
├── Candles Page: 132 → 19 lines (85% reduction)
├── Extrema Page: 107 → 19 lines (82% reduction)
├── Charts Page: 111 → 19 lines (83% reduction)
└── Total Reduction: 350 → 57 lines (84% overall reduction)
```

### 2. **Maintenance Benefits**
```mermaid
graph LR
    A[Single Bug Fix] --> B[ChartPanel Component]
    B --> C[Automatically Fixed in All Pages]
    C --> D[Candles Page ✅]
    C --> E[Extrema Page ✅]
    C --> F[Charts Page ✅]
    C --> G[Dashboard Charts ✅]

    style B fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style C fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
```

### 3. **Feature Addition Flow**
```mermaid
graph TB
    A[New Feature Request] --> B[Add to ChartPanel]
    B --> C[Configure in UnifiedChart]
    C --> D[Implement in Renderer]
    D --> E[Available in All Chart Types]
    E --> F[Candles Page Gets Feature]
    E --> G[Extrema Page Gets Feature]
    E --> H[Charts Page Gets Feature]
    E --> I[Dashboard Gets Feature]

    style B fill:#e1f5fe
    style E fill:#c8e6c9
```

## Implementation Patterns

### 1. **Configuration-Driven Reuse**
```javascript
// Single component, multiple configurations
const configurations = {
  candles: {
    chartType: "candlestick",
    showControls: true,
    showModeToggle: false
  },
  extrema: {
    chartType: "extrema",
    showControls: true,
    showModeToggle: true
  },
  dashboard: {
    chartType: "dashboard",
    showControls: false,
    showStats: false
  }
};
```

### 2. **Composition Pattern**
```javascript
// ChartPanel composes multiple reusable parts
<ChartPanel>
  {showControls && <ControlPanel />}
  {showStats && <StatsBar />}
  <ChartComponent />
  {error && <ErrorMessage />}
</ChartPanel>
```

### 3. **Hook-Based Data Sharing**
```javascript
// Consistent data management across all usages
const chartData = useChartData();
// Same hook used by all ChartPanel instances
```

## Future Extensibility

### 1. **New Chart Types**
```mermaid
graph LR
    A[Add New Chart Type] --> B[Create Renderer Function]
    B --> C[Add to UnifiedChart Options]
    C --> D[Add ChartPanel Configuration]
    D --> E[Available Everywhere]

    style E fill:#c8e6c9
```

### 2. **New Page Types**
```mermaid
graph LR
    A[New Page Requirement] --> B[Use ChartPanel Component]
    B --> C[Configure for Use Case]
    C --> D[19 Lines of Code]
    D --> E[Full Chart Functionality]

    style B fill:#e1f5fe
    style D fill:#c8e6c9
```

This modular, reusable architecture ensures that:
- ✅ No duplicate code across chart pages
- ✅ Single source of truth for chart logic
- ✅ Easy dashboard integration
- ✅ Automatic feature propagation
- ✅ Consistent user experience
- ✅ Minimal development effort for new features