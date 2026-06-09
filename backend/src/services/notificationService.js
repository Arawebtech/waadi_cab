const admin = require('firebase-admin');
const User = require('../models/User');

class NotificationService {
  constructor() {
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: "waadicab",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-xxxxx@waadicab.iam.gserviceaccount.com",
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDB3iItFkCZTNGD\nRiTg8pDaJcLeHJGR+GJpOaXxqaUjSWlkqiqpwkmkd3CqnKcq7lglnmXLOIpE8I4f\nFbSfuBPmd5gyQPxf0AXfK7pLl6k9/sYIKuMMgQzEjGFEcvAVibx9Sj3tUdWfBm7u\nIJsTf8WQOfgwFesF95cApHAFy4TO9AtZQczlqxyG4+kErzY0xucZEcZ5mlFfPOBa\nR8UJP/yXTzMyApmqJwIuiS7IFmhEU/ZIpz3YyK9VSfIT6pXtkY7HCMDjLCv3gBoH\n4V1Es0bdp941XuXoJSWnEm4oSiJWajlvVTvQLeznoxAaMM7wdmFH1boBEwuwAU86\nJIt3OetlAgMBAAECggEAL8YjueSf6qcpgiYI9H4SABAKI1366XPCHJgeMp1Rmo5+\nsFXWyZqdNzBPzVtpPoUZp7uO7jNyr2ZwP2zD5BAip0qVcNze1GWY7NQDxpkLFcHw\n3xZieTRcBxto5MtGKqiUkHN5K0BdWiDluTzDulxkPRRr+r2L+x52Uaw0BtmOUskW\nUdP2bhZCX1svrwPapLRYleJwDbr7963D5wFy+ohIfTy4RAKzCduXxYJf53GmCiIe\nXJ2emVuj9gnfwqdlGLxKbWSjOgTDmGIWbIeyrotR235f216i+TcGxysB+bEm8DRr\nD930ni5v6oZfNWxiBliHhhflOceJepvSgdDtmwuACQKBgQD8f3g6vQJs/hbJIF2f\nixikzp3K740m1v4a6P2VDDeJSo+qrBfqM8jKoAH8D5DDa5O4zxtm3pN4hUEeFr5e\n7s47L9pF1emSFGWGDJmNfWAIVoB59uN85/arZESS0/q8x2NFeW9EYzltTLjEhLPi\noDlVmVrfn5kfEjIN3PFTBaIgKwKBgQDEjn0hpRTZKo5ODEWD4ssepzsb13whdGdL\nR4wpRIjUmm67E9W2ljAILOGXkfqCMvFfIaqamYrSirP+nu8IS35SpPyyjY+9eJ6D\nIzleHssK70McMAyquRJ78CiKUU/s+LPnPkJ3sWJ5UA90g/Z69uQnMJDNWyfDLbg4\nrug4igzKrwKBgHORNEpOMEoKkgtEURWw6HqmRvqXYheg13Uhps8NZG3mPpNzaQ68\n3O5BBieESFHpbxdrU7NltEG5W/CVoFR7INFeOZ01J07BHyaXpcBo3gdy8CLiqYSF\n9xTDM8+wTlcRO5KU3iSC9cndD8SCqILVquhO5JTty3u5LEfEFIBXV7k5AoGAKSL5\nJVV7a4fwiH0g/10zzZKKWGVc4VOPWr36o5hoWraHfjfEfpYoL03VWPeASkeHJLXT\nEtAXscC9swhoVoAWTA2jpWrjLnBUHHX+x6gCLqOsk/WqcQCS0cWNdoVWCO50GG17\nU7mYNnN/CI+lwk5xqZIMfC4bwEmNSK+ygkLCMpkCgYAxRPQ+6EUjaI6Io0P8Siu+\nMjXjyaa5aXkJHZ0q7xR73i/63p5wBtlvi6SXvrUNcJQ+nPZN22Q8qqCQrzbrpnzl\ndUvccw7ggk7Tjp+IPCQceBVGcieHMiyyPcPBQn3nwiDY9NL5AZam0A8Y0xnuBvrT\nBRCB49sZJEn24QUbUYLhwQ==\n-----END PRIVATE KEY-----\n",
          }),
        });
        console.log('✅ Firebase Admin SDK initialized for notifications');
      }
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization error:', error.message);
    }
  }

  // Helper function to chunk array into smaller arrays
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Send maintenance notification to all users with batching
  async sendMaintenanceNotification(settings) {
    try {
      // Get all users with FCM tokens
      const users = await User.find({ 
        fcmToken: { $ne: null },
        isActive: true 
      }).select('fcmToken firstName');

      if (users.length === 0) {
        console.log('No users with FCM tokens found for maintenance notification');
        return;
      }

      const tokens = users.map(user => user.fcmToken).filter(Boolean);
      
      const message = {
        notification: {
          title: settings.maintenanceTitle || 'App Maintenance',
          body: settings.maintenanceMessage || 'We are currently under maintenance. We will be back soon!',
        },
        data: {
          type: 'maintenance',
          maintenanceMode: 'true',
          estimatedReturnTime: settings.estimatedReturnTime ? settings.estimatedReturnTime.toISOString() : '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          notification: {
            channelId: 'wadi-cab-maintenance',
            priority: 'high',
            defaultSound: true,
            icon: 'ic_notification',
            color: '#FF6B35'
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: settings.maintenanceTitle || 'App Maintenance',
                body: settings.maintenanceMessage || 'We are currently under maintenance. We will be back soon!'
              }
            },
          },
        },
      };

      // Firebase has a limit of 500 tokens per multicast request
      const MAX_TOKENS_PER_BATCH = 500;
      const tokenChunks = this.chunkArray(tokens, MAX_TOKENS_PER_BATCH);
      
      console.log(`📊 Sending maintenance notification to ${tokens.length} tokens in ${tokenChunks.length} batches`);

      let totalSuccessCount = 0;
      let totalFailureCount = 0;

      // Send notifications in batches
      for (let i = 0; i < tokenChunks.length; i++) {
        const chunk = tokenChunks[i];
        console.log(`📤 Sending maintenance batch ${i + 1}/${tokenChunks.length} (${chunk.length} tokens)`);
        
        try {
          const response = await admin.messaging().sendEachForMulticast({
            tokens: chunk,
            ...message,
          });

          totalSuccessCount += response.successCount;
          totalFailureCount += response.failureCount;
          
          console.log(`✅ Maintenance batch ${i + 1} completed: ${response.successCount} success, ${response.failureCount} failures`);
          
          // Add small delay between batches to avoid rate limiting
          if (i < tokenChunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (batchError) {
          console.error(`❌ Error in maintenance batch ${i + 1}:`, batchError.message);
          totalFailureCount += chunk.length;
        }
      }

      console.log('✅ Maintenance notification sent:', {
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        totalTokens: tokens.length,
        batchesSent: tokenChunks.length,
      });

      return {
        success: true,
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        totalTokens: tokens.length,
        batchesSent: tokenChunks.length
      };

    } catch (error) {
      console.error('❌ Error sending maintenance notification:', error);
      throw error;
    }
  }

  // Send notification to specific user when they try to use app during maintenance
  async sendMaintenanceAlertToUser(userId, settings) {
    try {
      const user = await User.findById(userId).select('fcmToken firstName');
      
      if (!user || !user.fcmToken) {
        console.log(`User ${userId} has no FCM token for maintenance alert`);
        return;
      }

      const message = {
        token: user.fcmToken,
        notification: {
          title: settings.maintenanceTitle || 'App Currently Unavailable',
          body: settings.maintenanceMessage || 'We are currently under maintenance. We will be back soon!',
        },
        data: {
          type: 'maintenance_alert',
          maintenanceMode: 'true',
          estimatedReturnTime: settings.estimatedReturnTime ? settings.estimatedReturnTime.toISOString() : '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          notification: {
            channelId: 'wadi-cab-maintenance',
            priority: 'high',
            defaultSound: true,
            icon: 'ic_notification',
            color: '#FF6B35'
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`✅ Maintenance alert sent to user ${userId}:`, response);

      return {
        success: true,
        messageId: response
      };

    } catch (error) {
      console.error(`❌ Error sending maintenance alert to user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
