# 🚀 Complete Integrated Build Guide

## 📁 **Project Structure**

```
ChartsSimulator/
├── pom.xml                          # ✅ Updated with frontend build
├── build.sh                         # ✅ Build script
├── run.sh                          # ✅ Development run script  
├── deploy.sh                       # ✅ Production deployment script
├── src/
│   └── main/
│       ├── java/.../
│       │   ├── ChartsSimulatorApplication.java
│       │   ├── config/
│       │   │   ├── WebSocketConfig.java
│       │   │   ├── StaticResourceConfig.java  # ✅ NEW
│       │   │   └── WebConfig.java             # ✅ NEW
│       │   ├── controller/
│       │   ├── service/
│       │   └── model/
│       └── resources/
│           ├── application.yml       # ✅ Updated
│           └── static/              # ✅ Generated (frontend build output)
└── frontend/
    ├── package.json                 # ✅ Updated
    ├── next.config.js              # ✅ Updated for static export
    ├── .env.production             # ✅ NEW
    ├── .env.production.local       # ✅ NEW  
    ├── app/
    ├── components/
    └── services/
```

---

## 🔧 **Setup Instructions**

### **1. Update Files**
Replace/create these files in your project:

#### **Backend Files:**
- ✅ `pom.xml` - Maven configuration with frontend build
- ✅ `src/main/resources/application.yml` - Updated configuration
- ✅ `src/main/java/.../config/StaticResourceConfig.java` - NEW file
- ✅ `src/main/java/.../config/WebConfig.java` - NEW file

#### **Frontend Files:**
- ✅ `frontend/next.config.js` - Static export configuration
- ✅ `frontend/package.json` - Updated scripts
- ✅ `frontend/.env.production` - Production environment
- ✅ `frontend/.env.production.local` - Local production testing

#### **Build Scripts:**
- ✅ `build.sh` - Main build script
- ✅ `run.sh` - Development runner
- ✅ `deploy.sh` - Production deployment

### **2. Make Scripts Executable**
```bash
chmod +x build.sh run.sh deploy.sh
```

---

## 🏗️ **Build Commands**

### **Development Build (Backend Only)**
```bash
# Quick backend-only build for development
./build.sh dev
# OR
./mvnw clean package -Pdev
```

### **Production Build (Frontend + Backend)**
```bash
# Full production build with frontend integration
./build.sh prod
# OR  
./mvnw clean package -Pprod
```

### **Fast Build (Skip Everything)**
```bash
# Ultra-fast build (no frontend, no tests)
./build.sh fast
# OR
./mvnw clean package -Pfast
```

---

## 🚀 **Running the Application**

### **Development Mode (Separate Frontend/Backend)**
```bash
# Terminal 1: Backend
./run.sh

# Terminal 2: Frontend  
cd frontend
npm run dev

# Access: http://localhost:3000 (frontend) + http://localhost:9090 (backend)
```

### **Integrated Mode (Single JAR)**
```bash
# Build and run integrated
./build.sh prod
java -jar target/ChartsSimulator-0.0.1-SNAPSHOT.jar --spring.profiles.active=integrated

# Access: http://localhost:9090 (single URL for everything)
```

### **Production Mode**
```bash
# Deploy and run
./deploy.sh
java -jar deploy/charts-simulator.jar --spring.profiles.active=prod

# Access: http://localhost:9090 or your production domain
```

---

## 🔄 **Build Process Explanation**

### **What Happens During Build:**

1. **Maven cleans** previous builds
2. **Node.js/npm** gets installed automatically
3. **Frontend dependencies** get installed (`npm install`)
4. **Frontend builds** to static files (`npm run build`)
5. **Static files copied** to `src/main/resources/static/`
6. **Backend compiles** with embedded frontend
7. **Single JAR created** containing everything

### **Generated Structure:**
```
target/classes/static/
├── index.html           # Main app entry point
├── _next/              # Next.js built assets
│   ├── static/         # JavaScript bundles
│   └── ...
├── favicon.ico         # App icon
└── ...                 # Other static assets
```

---

## 🌐 **URL Structure**

### **Integrated Mode URLs:**
```
http://localhost:9090/           # Frontend app
http://localhost:9090/api/ohlc   # Backend REST API
http://localhost:9090/ws         # WebSocket endpoint
http://localhost:9090/swagger-ui.html  # API docs
```

### **Development Mode URLs:**
```
http://localhost:3000/           # Frontend dev server
http://localhost:9090/api/ohlc   # Backend REST API
http://localhost:9090/ws         # WebSocket endpoint
```

---

## 🎯 **Deployment Scenarios**

### **1. Single JAR Deployment**
```bash
# Build once, deploy anywhere
./build.sh prod
scp target/Char
