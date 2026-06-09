// // utils/saveCustomerLog.js



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

// const CustomerLog = require("../models/CustomerLog");

// const saveCustomerLog = async ({
//   userId = null,
//   phoneNumber = null,
//   type,
//   req,
//   extraData = null
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

//     const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

//     await CustomerLog.findOneAndUpdate(
//       query,
//       {
//         $set: {
//           ...(userId && { userId }),
//           ...(phoneNumber && { phoneNumber }),

//           [`logs.${type}`]: {
//             data: req.body,

//             // API URL
//             url: req.originalUrl || req.url,

//             // HTTP Method
//             method: req.method,
//             fullUrl,

//             // IP Address
//             ip:
//               req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
//               req.socket?.remoteAddress ||
//               req.ip,

//             // Device / Browser Info
//             device: req.headers["user-agent"],

//             // Query Params
//             query: req.query,

//             // Route Params
//             params: req.params,

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

// module.exports = saveCustomerLog;




// const saveCustomerLog = async ({
//   userId = null,
//   phoneNumber = null,
//   type,
//   req,
//   extraData = null
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

//     // 🔥 SAFE req extraction (NO CRASH EVER)
//     const fullUrl =
//       req?.protocol && req?.get
//         ? `${req.protocol}://${req.get("host")}${req.originalUrl}`
//         : req?.originalUrl || req?.url || "unknown";

//     const logData = {
//       data: extraData || req?.body || {},

//       url: req?.originalUrl || req?.url || "unknown",
//       method: req?.method || "unknown",
//       fullUrl,

//       ip:
//         req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
//         req?.socket?.remoteAddress ||
//         req?.ip ||
//         "unknown",

//       device: req?.headers?.["user-agent"] || "unknown",

//       query: req?.query || {},
//       params: req?.params || {},

//       createdAt: new Date(),
//     };

//     await CustomerLog.findOneAndUpdate(
//       query,
//       {
//         $set: {
//           ...(userId && { userId }),
//           ...(phoneNumber && { phoneNumber }),

//           [`logs.${type}`]: logData,
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

// module.exports = saveCustomerLog;



const CustomerLog = require("../models/CustomerLog");

/**
 * 🔥 Deep clean function (removes null/undefined recursively)
 */
const removeNullUndefined = (obj) => {
  if (Array.isArray(obj)) {
    return obj
      .map(removeNullUndefined)
      .filter((v) => v !== undefined && v !== null);
  }

  if (obj && typeof obj === "object") {
    const newObj = {};

    Object.keys(obj).forEach((key) => {
      const value = removeNullUndefined(obj[key]);

      if (value !== undefined && value !== null) {
        newObj[key] = value;
      }
    });

    return newObj;
  }

  return obj;
};

/**
 * 📌 Save Customer Log (SAFE VERSION)
 */
const saveCustomerLog = async ({
  userId = null,
  phoneNumber = null,
  type,
  req,
  extraData = null,
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

    // 🔥 SAFE req extraction (NO CRASH EVER)
    const fullUrl =
      req?.protocol && req?.get
        ? `${req.protocol}://${req.get("host")}${req.originalUrl}`
        : req?.originalUrl || req?.url || "unknown";

    const rawLogData = {
      data: extraData || req?.body,

      method: req?.method,
      fullUrl,

      ip:
        req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req?.socket?.remoteAddress ||
        req?.ip,

      device: req?.headers?.["user-agent"],

      query: req?.query,
      params: req?.params,

      createdAt: new Date(),
    };

    // 🔥 CLEAN DATA BEFORE SAVE
    const logData = removeNullUndefined(rawLogData);

    await CustomerLog.findOneAndUpdate(
      query,
      {
        $set: {
          ...(userId && { userId }),
          ...(phoneNumber && { phoneNumber }),

          [`logs.${type}`]: logData,
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