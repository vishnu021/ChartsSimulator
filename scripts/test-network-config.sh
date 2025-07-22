#!/bin/bash
# Test script to verify network configuration

echo "🔍 Testing Network Configuration"
echo "================================"

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address"
    exit 1
fi

echo "🖥️  Local IP detected: $LOCAL_IP"
echo "🔧 Testing configuration endpoint..."

# Test the config endpoint
echo ""
echo "📡 Testing: http://$LOCAL_IP:9090/api/config"
curl -s "http://$LOCAL_IP:9090/api/config" | python3 -m json.tool || {
    echo "❌ Config endpoint test failed"
    echo "💡 Make sure the application is running with: mvn spring-boot:run"
    exit 1
}

echo ""
echo "✅ Configuration test completed!"
echo ""
echo "🌐 Access your application from other devices using:"
echo "   http://$LOCAL_IP:9090"
echo ""
echo "📋 The frontend will automatically detect and use the correct backend URL"