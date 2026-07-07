# 🚀 PayU Payment Integration Setup Guide

## 📋 **Current Configuration**

Your frontend is now configured to work with your local backend:

### **Backend API Endpoints:**
- **Hash Generation**: `POST http://localhost:4001/api/v1/payment/generate-hash`
- **Payment Verification**: `POST http://localhost:4001/api/v1/payment/verify`
- **Payment Status**: `GET http://localhost:4001/api/v1/payment/status/:txnId`

### **Frontend URLs:**
- **Success Page**: `http://localhost/payment/success`
- **Failure Page**: `http://localhost/payment/failure`

## 🌐 **PayU Callback URLs Issue**

**Problem**: PayU needs to redirect users back to your frontend after payment, but `localhost:3000` is not publicly accessible.

**Solution**: Use a tunnel service (ngrok) to make your 192.168.1.8 publicly accessible.

## 🛠️ **Setup Steps**

### **1. Install ngrok**
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

### **2. Start Your Frontend**
```bash
npm run dev
# Frontend will run on http://localhost
```

### **3. Start ngrok Tunnel**
```bash
# Use the provided script
./setup-ngrok.sh

# Or manually
ngrok http 3000
```

### **4. Get Public URL**
ngrok will show you a public URL like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost
```

### **5. Update PayU Configuration**
In your PayU merchant panel, set these callback URLs:
- **Success URL**: `https://abc123.ngrok.io/payment/success`
- **Failure URL**: `https://abc123.ngrok.io/payment/failure`

## 🔄 **Payment Flow**

```
1. User clicks "Pay" → Frontend calls backend for hash
2. Frontend opens PayU gateway → User completes payment
3. PayU redirects to ngrok URL → Frontend success/failure page loads
4. Frontend calls backend to verify payment → Backend verifies with PayU
5. Frontend shows success/failure message
```

## 📱 **Testing the Integration**

### **1. Start Backend**
```bash
# In your backend directory
npm run dev
# Backend should run on http://localhost:4001
```

### **2. Start Frontend**
```bash
npm run dev
# Frontend will run on http://localhost
```

### **3. Start ngrok**
```bash
./setup-ngrok.sh
```

### **4. Test Payment Flow**
1. Go to: `http://localhost/border-tax`
2. Fill the form
3. Click "Proceed to Payment"
4. Complete test payment on PayU
5. Verify redirect to success/failure page

## 🚨 **Important Notes**

### **Development vs Production**
- **Development**: Use ngrok URLs for PayU callbacks
- **Production**: Use your actual domain (e.g., `https://wadicab.com`)

### **ngrok Limitations**
- URLs change each time you restart ngrok
- Free tier has limitations
- For production, use your actual domain

### **Environment Variables**
Create `.env.local` with your actual PayU credentials:
```env
NEXT_PUBLIC_PAYU_MERCHANT_KEY=your_actual_key
NEXT_PUBLIC_PAYU_MERCHANT_SALT=your_actual_salt
NEXT_PUBLIC_PAYU_ENVIRONMENT=production
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. "Authorization header is required"**
- Ensure user is logged in
- Check if `tokenManager.getAccessToken()` returns a valid token

#### **2. "Transaction ID, status, amount, and booking data are required"**
- Verify all required data is sent in the verification request
- Check localStorage for `pendingPayment` data

#### **3. PayU callback not working**
- Ensure ngrok is running
- Verify PayU callback URLs are correct
- Check if frontend is accessible via ngrok URL

#### **4. Backend API errors**
- Verify backend is running on port 4001
- Check backend logs for detailed error messages
- Ensure all required fields are sent

## 📞 **Support**

If you encounter issues:
1. Check browser console for frontend errors
2. Check terminal for backend errors
3. Verify all URLs and configurations
4. Test with the development payment status check button

## 🎯 **Next Steps**

1. **Test the complete flow** with ngrok
2. **Verify backend integration** is working
3. **Update PayU credentials** with your actual keys
4. **Deploy to production** with your actual domain

---

**Happy Coding! 🚀** 