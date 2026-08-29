const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
// Simple in-memory stores (replace with DB later)
const registeredTokens = new Set();
const userIdToToken = new Map();

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "waadicab",
        clientEmail: "firebase-adminsdk-fbsvc@waadicab.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDB3iItFkCZTNGD\nRiTg8pDaJcLeHJGR+GJpOaXxqaUjSWlkqiqpwkmkd3CqnKcq7lglnmXLOIpE8I4f\nFbSfuBPmd5gyQPxf0AXfK7pLl6k9/sYIKuMMgQzEjGFEcvAVibx9Sj3tUdWfBm7u\nIJsTf8WQOfgwFesF95cApHAFy4TO9AtZQczlqxyG4+kErzY0xucZEcZ5mlFfPOBa\nR8UJP/yXTzMyApmqJwIuiS7IFmhEU/ZIpz3YyK9VSfIT6pXtkY7HCMDjLCv3gBoH\n4V1Es0bdp941XuXoJSWnEm4oSiJWajlvVTvQLeznoxAaMM7wdmFH1boBEwuwAU86\nJIt3OetlAgMBAAECggEAL8YjueSf6qcpgiYI9H4SABAKI1366XPCHJgeMp1Rmo5+\nsFXWyZqdNzBPzVtpPoUZp7uO7jNyr2ZwP2zD5BAip0qVcNze1GWY7NQDxpkLFcHw\n3xZieTRcBxto5MtGKqiUkHN5K0BdWiDluTzDulxkPRRr+r2L+x52Uaw0BtmOUskW\nUdP2bhZCX1svrwPapLRYleJwDbr7963D5wFy+ohIfTy4RAKzCduXxYJf53GmCiIe\nXJ2emVuj9gnfwqdlGLxKbWSjOgTDmGIWbIeyrotR235f216i+TcGxysB+bEm8DRr\nD930ni5v6oZfNWxiBliHhhflOceJepvSgdDtmwuACQKBgQD8f3g6vQJs/hbJIF2f\nixikzp3K740m1v4a6P2VDDeJSo+qrBfqM8jKoAH8D5DDa5O4zxtm3pN4hUEeFr5e\n7s47L9pF1emSFGWGDJmNfWAIVoB59uN85/arZESS0/q8x2NFeW9EYzltTLjEhLPi\noDlVmVrfn5kfEjIN3PFTBaIgKwKBgQDEjn0hpRTZKo5ODEWD4ssepzsb13whdGdL\nR4wpRIjUmm67E9W2ljAILOGXkfqCMvFfIaqamYrSirP+nu8IS35SpPyyjY+9eJ6D\nIzleHssK70McMAyquRJ78CiKUU/s+LPnPkJ3sWJ5UA90g/Z69uQnMJDNWyfDLbg4\nrug4igzKrwKBgHORNEpOMEoKkgtEURWw6HqmRvqXYheg13Uhps8NZG3mPpNzaQ68\n3O5BBieESFHpbxdrU7NltEG5W/CVoFR7INFeOZ01J07BHyaXpcBo3gdy8CLiqYSF\n9xTDM8+wTlcRO5KU3iSC9cndD8SCqILVquhO5JTty3u5LEfEFIBXV7k5AoGAKSL5\nJVV7a4fwiH0g/10zzZKKWGVc4VOPWr36o5hoWraHfjfEfpYoL03VWPeASkeHJLXT\nEtAXscC9swhoVoAWTA2jpWrjLnBUHHX+x6gCLqOsk/WqcQCS0cWNdoVWCO50GG17\nU7mYNnN/CI+lwk5xqZIMfC4bwEmNSK+ygkLCMpkCgYAxRPQ+6EUjaI6Io0P8Siu+\nMjXjyaa5aXkJHZ0q7xR73i/63p5wBtlvi6SXvrUNcJQ+nPZN22Q8qqCQrzbrpnzl\ndUvccw7ggk7Tjp+IPCQceBVGcieHMiyyPcPBQn3nwiDY9NL5AZam0A8Y0xnuBvrT\nBRCB49sZJEn24QUbUYLhwQ==\n-----END PRIVATE KEY-----\n",
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error.message);
  }
}

// Register FCM token
router.post('/register', async (req, res) => {
  try {
    const { token, platform, userId } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    console.log('🔔 Registering FCM token:', {
      token: token.substring(0, 20) + '...',
      platform,
      userId
    });

    // Store token (DB + in-memory cache)
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { fcmToken: token }, { new: true });
        userIdToToken.set(userId, token);
      } catch (e) {
        console.error('❌ Failed to persist FCM token to user:', e.message);
      }
    }
    registeredTokens.add(token);
    console.log('✅ FCM token registered successfully. Totals:', {
      tokens: registeredTokens.size,
      mappedUsers: userIdToToken.size,
    });

    res.json({
      success: true,
      message: 'FCM token registered successfully'
    });
  } catch (error) {
    console.error('❌ Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM token'
    });
  }
});

// Send push notification to specific user
router.post('/send-to-user', async (req, res) => {
  try {
    const { userId, token: directToken, title, body, data = {} } = req.body;

    if ((!userId && !directToken) || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'title and body are required; provide userId or token'
      });
    }

    // Resolve token
    let userToken = directToken;
    if (!userToken && userId) {
      // Try cache first
      userToken = userIdToToken.get(userId);
      // Fallback to DB
      if (!userToken) {
        const user = await User.findById(userId).select('fcmToken');
        userToken = user?.fcmToken || null;
        if (userToken) userIdToToken.set(userId, userToken);
      }
    }

    if (!userToken) {
      return res.status(404).json({
        success: false,
        message: 'User FCM token not found'
      });
    }

    const message = {
      token: userToken,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          channelId: 'wadi-cab-notifications',
          priority: 'high',
          defaultSound: true,
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
    console.log('✅ Push notification sent successfully:', response);

    res.json({
      success: true,
      message: 'Push notification sent successfully',
      messageId: response
    });
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send push notification',
      error: error.message
    });
  }
});

// Helper function to chunk array into smaller arrays
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Send push notification to all users with batching
// router.post('/send-to-all', async (req, res) => {
//   try {
//     const { title, body, data = {} } = req.body;

//     if (!title || !body) {
//       return res.status(400).json({
//         success: false,
//         message: 'title and body are required'
//       });
//     }

//     // Collect tokens from DB
//     const dbUsers = await User.find({ fcmToken: { $ne: null } }).select('fcmToken');
//     const tokens = dbUsers.map(u => u.fcmToken).filter(Boolean);

//     if (tokens.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No FCM tokens found'
//       });
//     }

//     const message = {
//       notification: {
//         title,
//         body,
//       },
//       data: {
//         ...data,
//         click_action: 'FLUTTER_NOTIFICATION_CLICK',
//       },
//       android: {
//         notification: {
//           channelId: 'wadi-cab-notifications',
//           priority: 'high',
//           defaultSound: true,
//         },
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: 'default',
//             badge: 1,
//           },
//         },
//       },
//     };

//     // Firebase has a limit of 500 tokens per multicast request
//     const MAX_TOKENS_PER_BATCH = 500;
//     const tokenChunks = chunkArray(tokens, MAX_TOKENS_PER_BATCH);
    
//     console.log(`📊 Sending notification to ${tokens.length} tokens in ${tokenChunks.length} batches`);

//     let totalSuccessCount = 0;
//     let totalFailureCount = 0;
//     const batchResults = [];

//     // Send notifications in batches
//     for (let i = 0; i < tokenChunks.length; i++) {
//       const chunk = tokenChunks[i];
//       console.log(`📤 Sending batch ${i + 1}/${tokenChunks.length} (${chunk.length} tokens)`);
      
//       try {
//         const response = await admin.messaging().sendEachForMulticast({
//           tokens: chunk,
//           ...message,
//         });

//         totalSuccessCount += response.successCount;
//         totalFailureCount += response.failureCount;
        
//         batchResults.push({
//           batch: i + 1,
//           tokensInBatch: chunk.length,
//           successCount: response.successCount,
//           failureCount: response.failureCount,
//         });

//         console.log(`✅ Batch ${i + 1} completed: ${response.successCount} success, ${response.failureCount} failures`);
        
//         // Add small delay between batches to avoid rate limiting
//         if (i < tokenChunks.length - 1) {
//           await new Promise(resolve => setTimeout(resolve, 100));
//         }
//       } catch (batchError) {
//         console.error(`❌ Error in batch ${i + 1}:`, batchError.message);
//         totalFailureCount += chunk.length;
        
//         batchResults.push({
//           batch: i + 1,
//           tokensInBatch: chunk.length,
//           successCount: 0,
//           failureCount: chunk.length,
//           error: batchError.message,
//         });
//       }
//     }

//     console.log('✅ All batches completed:', {
//       totalSuccessCount,
//       totalFailureCount,
//       totalTokens: tokens.length,
//       batchesSent: tokenChunks.length,
//     });

//     res.json({
//       success: true,
//       message: 'Multicast push notification sent in batches',
//       successCount: totalSuccessCount,
//       failureCount: totalFailureCount,
//       totalTokens: tokens.length,
//       batchesSent: tokenChunks.length,
//       batchResults,
//     });
//   } catch (error) {
//     console.error('❌ Error sending multicast push notification:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to send multicast push notification',
//       error: error.message
//     });
//   }
// });




// Send push notification to all users with batching
router.post('/send-to-all', async (req, res) => {
  try {
    const { title, body, data = {} } = req.body;

    // -----------------------------------------
    // 1. Validate request
    // -----------------------------------------
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof body !== 'string' ||
      !body.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'title and body are required',
      });
    }

    // -----------------------------------------
    // 2. Get users having FCM tokens
    // -----------------------------------------
    const [totalUsers, dbUsers] = await Promise.all([
      User.countDocuments(),

      User.find({
        fcmToken: {
          $exists: true,
          $nin: [null, ''],
        },
      })
        .select('fcmToken')
        .lean(),
    ]);

    // -----------------------------------------
    // 3. Create unique token list
    // -----------------------------------------
    const tokenSet = new Set();

    for (const user of dbUsers) {
      if (
        typeof user.fcmToken === 'string' &&
        user.fcmToken.trim()
      ) {
        tokenSet.add(user.fcmToken.trim());
      }
    }

    const tokens = Array.from(tokenSet);

    // -----------------------------------------
    // 4. No tokens
    // -----------------------------------------
    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No FCM tokens found',
        statistics: {
          totalUsers,
          usersWithFcmToken: dbUsers.length,
          uniqueTokens: 0,
          batchesSent: 0,
          successCount: 0,
          failureCount: 0,
        },
      });
    }

    // -----------------------------------------
    // 5. Sanitize notification data
    // FCM data values must be strings
    // -----------------------------------------
    const notificationData = {};

    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
    ) {
      Object.entries(data).forEach(([key, value]) => {
        if (key && value !== undefined && value !== null) {
          notificationData[String(key)] = String(value);
        }
      });
    }

    notificationData.click_action =
      'FLUTTER_NOTIFICATION_CLICK';

    // -----------------------------------------
    // 6. Firebase message
    // -----------------------------------------
    const message = {
      notification: {
        title: title.trim(),
        body: body.trim(),
      },

      data: notificationData,

      android: {
        priority: 'high',

        notification: {
          channelId: 'wadi-cab-notifications',
          priority: 'high',
          defaultSound: true,
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

    // -----------------------------------------
    // 7. Split into Firebase allowed batches
    // -----------------------------------------
    const MAX_TOKENS_PER_BATCH = 500;

    const tokenChunks = [];

    for (
      let i = 0;
      i < tokens.length;
      i += MAX_TOKENS_PER_BATCH
    ) {
      tokenChunks.push(
        tokens.slice(i, i + MAX_TOKENS_PER_BATCH)
      );
    }

    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    const invalidTokens = [];

    const batchResults = [];

    // -----------------------------------------
    // 8. Send each batch
    // -----------------------------------------
    for (const [index, chunk] of tokenChunks.entries()) {
      try {
        const response =
          await admin.messaging().sendEachForMulticast({
            tokens: chunk,
            ...message,
          });

        totalSuccessCount += response.successCount || 0;
        totalFailureCount += response.failureCount || 0;

        // ---------------------------------------
        // Find invalid/expired tokens
        // ---------------------------------------
        if (Array.isArray(response.responses)) {
          response.responses.forEach((result, tokenIndex) => {
            if (!result?.success) {
              const errorCode = result?.error?.code;

              if (
                errorCode ===
                  'messaging/registration-token-not-registered' ||
                errorCode ===
                  'messaging/invalid-registration-token'
              ) {
                const failedToken = chunk[tokenIndex];

                if (failedToken) {
                  invalidTokens.push(failedToken);
                }
              }
            }
          });
        }

        batchResults.push({
          batch: index + 1,
          tokens: chunk.length,
          successCount: response.successCount || 0,
          failureCount: response.failureCount || 0,
          status: 'completed',
        });

        // Small delay to reduce sudden request pressure
        if (index < tokenChunks.length - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, 100)
          );
        }
      } catch (batchError) {
        // Do not crash the complete notification process
        totalFailureCount += chunk.length;

        batchResults.push({
          batch: index + 1,
          tokens: chunk.length,
          successCount: 0,
          failureCount: chunk.length,
          status: 'failed',
        });

        // Continue with next batch
      }
    }

    // -----------------------------------------
    // 9. Remove invalid FCM tokens
    // -----------------------------------------
    const uniqueInvalidTokens = [
      ...new Set(invalidTokens),
    ];

    let invalidTokensRemoved = 0;

    if (uniqueInvalidTokens.length > 0) {
      try {
        const cleanupResult = await User.updateMany(
          {
            fcmToken: {
              $in: uniqueInvalidTokens,
            },
          },
          {
            $set: {
              fcmToken: null,
            },
          }
        );

        invalidTokensRemoved =
          cleanupResult.modifiedCount || 0;
      } catch (cleanupError) {
        // Cleanup failure should never break notification response
        invalidTokensRemoved = 0;
      }
    }

    // -----------------------------------------
    // 10. Final response
    // -----------------------------------------
    return res.status(200).json({
      success: true,
      message: 'Push notification processing completed',

      statistics: {
        totalUsers,
        usersWithFcmToken: dbUsers.length,
        uniqueTokens: tokens.length,

        batchesSent: tokenChunks.length,

        successCount: totalSuccessCount,
        failureCount: totalFailureCount,

        invalidTokensFound:
          uniqueInvalidTokens.length,

        invalidTokensRemoved,
      },

      batchResults,
    });
  } catch (error) {
    // -----------------------------------------
    // Global safety handler
    // -----------------------------------------
    return res.status(500).json({
      success: false,
      message: 'Failed to send push notification',
    });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Push notification service is running',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Push notification service error',
      error: error.message
    });
  }
});

// Update FCM token for authenticated user
router.post('/update-token', authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user?._id; // From auth middleware
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Update user's FCM token in database
    await User.findByIdAndUpdate(userId, { fcmToken: token }, { new: true });
    
    // Update in-memory cache
    userIdToToken.set(userId, token);
    registeredTokens.add(token);
    
    console.log(`🔔 Updated FCM token for user ${userId}: ${token.substring(0, 20)}...`);
    
    res.json({
      success: true,
      message: 'FCM token updated successfully',
      data: {
        userId,
        tokenUpdated: true
      }
    });
  } catch (error) {
    console.error('❌ Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message
    });
  }
});

// Test notification with your specific token
router.post('/test-notification', async (req, res) => {
  try {
    const { title = '🎉 Test Notification', body = 'Push notifications are working!' } = req.body;
    
    // Use your actual FCM token
    const userToken = 'eScQq9f3TvGvjAFknorhvk:APA91bE5G6fUpgaB4J5V9lPJGhkAF8_NTtO019BDHK90Q4_No4AXQCz8LrelGwCMYWJdhTULETZdKsXNahKxZ-Ls2DBo3BNW9CQFYYENK8Cj1dsNgkObDF8';

    const message = {
      token: userToken,
      notification: {
        title,
        body,
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          channelId: 'wadi-cab-notifications',
          priority: 'high',
          defaultSound: true,
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

    console.log('🔔 Sending message to Firebase:', {
      token: userToken.substring(0, 20) + '...',
      title: message.notification.title,
      body: message.notification.body,
      data: message.data
    });

    const response = await admin.messaging().send(message);
    console.log('✅ Test push notification sent successfully:', response);
    console.log('✅ Message ID:', response);

    res.json({
      success: true,
      message: 'Test push notification sent successfully',
      messageId: response,
      token: userToken.substring(0, 20) + '...',
      debug: {
        tokenLength: userToken.length,
        messageSent: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error sending test push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test push notification',
      error: error.message
    });
  }
});

module.exports = router;
