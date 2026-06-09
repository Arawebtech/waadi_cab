// // utils/saveCustomerLog.js

// const CustomerLog = require("../models/CustomerLog");

// module.exports = async (
//   userId,
//   type,
//   req
// ) => {
//   await CustomerLog.findOneAndUpdate(
//     { userId },
//     {
//       $set: {
//         [`logs.${type}`]: {
//           data: req.body,
//           ip:
//             req.headers["x-forwarded-for"]?.split(",")[0] ||
//             req.ip,
//           device: req.headers["user-agent"],
//           createdAt: new Date(),
//         },
//       },
//     },
//     { upsert: true }
//   );
// };



// utils/saveCustomerLog.js

// const CustomerLog = require("../models/CustomerLog");

// const saveCustomerLog = async ({
//   userId = null,
//   phoneNumber = null,
//   type,
//   req,
// }) => {
//   try {
//     const query = {};

//     if (userId) {
//       query.userId = userId;
//     } else if (phoneNumber) {
//       query.phoneNumber = phoneNumber;
//     } else {
//       return;
//     }

//     await CustomerLog.findOneAndUpdate(
//       query,
//       {
//         $set: {
//           ...(userId && { userId }),
//           ...(phoneNumber && { phoneNumber }),

//           [`logs.${type}`]: {
//             data: req.body ,
//             ip:
//               req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
//               req.socket?.remoteAddress ||
//               req.ip,
//             device: req.headers["user-agent"],
//             createdAt: new Date(),
//           },
//         },
//       },
//       {
//         upsert: true,
//         new: true,
//       }
//     );
//   } catch (error) {
//     console.error("Customer Log Error:", error);
//   }
// };

// utils/saveCustomerLog.js

const CustomerLog = require("../models/CustomerLog");

const saveCustomerLog = async ({
  userId = null,
  phoneNumber = null,
  type,
  req,
}) => {
  try {
    const query = {};

    if (userId) {
      query.userId = userId;
    } else if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    } else {
      return;
    }

    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    await CustomerLog.findOneAndUpdate(
      query,
      {
        $set: {
          ...(userId && { userId }),
          ...(phoneNumber && { phoneNumber }),

          [`logs.${type}`]: {
            data: req.body,

            // API URL
            url: req.originalUrl || req.url,

            // HTTP Method
            method: req.method,
            fullUrl,

            // IP Address
            ip:
              req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
              req.socket?.remoteAddress ||
              req.ip,

            // Device / Browser Info
            device: req.headers["user-agent"],

            // Query Params
            query: req.query,

            // Route Params
            params: req.params,

            createdAt: new Date(),
          },
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
  } catch (error) {
    console.error("Customer Log Error:", error);
  }
};

module.exports = saveCustomerLog;

