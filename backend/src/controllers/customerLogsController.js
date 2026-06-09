const CustomerLog = require("../models/CustomerLog");
exports.getLogs = async (req, res) => {
  try {
    const {
      userId,
      phoneNumber,
      download,
      page = 1,
      limit = 20,
    } = req.query;

    const formatIndianDate = (date) => {
      if (!date) return null;

      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    };

    const formatJourney = (customer) => {
      const customerObj = customer.toObject();

      const journey = Object.entries(
        customerObj.logs || {}
      )
        .map(([eventKey, eventData]) => ({
          event: eventKey
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim(),

          eventKey,

          date: formatIndianDate(eventData.createdAt),

          timestamp: eventData.createdAt,

          ip: eventData.ip || "N/A",

          device: eventData.device || "Unknown Device",

          data: eventData.data || {},
        }))
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
        );

      return {
        customer: {
          userId: customerObj.userId?._id,

          fullName: [
            customerObj.userId?.firstName,
            customerObj.userId?.lastName,
          ]
            .filter(Boolean)
            .join(" "),

          firstName: customerObj.userId?.firstName,

          lastName: customerObj.userId?.lastName,

          phoneNumber: customerObj.phoneNumber,

          userType: customerObj.userId?.userType,

          isActive: customerObj.userId?.isActive,

          isVerified: customerObj.userId?.isVerified,

          platform: customerObj.userId?.platform,

          appVersion: customerObj.userId?.appVersion,

          createdAt: formatIndianDate(
            customerObj.userId?.createdAt
          ),

          lastLogin: formatIndianDate(
            customerObj.userId?.lastLogin
          ),
        },

        totalEvents: journey.length,

        latestActivity:
          journey.length > 0 ? journey[0].date : null,

        journey,
      };
    };

    let query = {};

    if (userId) {
      query.userId = userId;
    }

    if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }

    // =========================
    // SINGLE CUSTOMER JOURNEY
    // =========================
    if (userId || phoneNumber) {
      const customer = await CustomerLog.findOne(query)
        .populate("userId");

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer log not found",
        });
      }

      const formattedData = formatJourney(customer);

      

// const buildMeta = (customerObj) => {
//   const user = customerObj.userId || {};

//   return {
//     id: user._id,
//     name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
//     phone: customerObj.phoneNumber,
//     type: user.userType,
//     platform: user.platform,
//     appVersion: user.appVersion,
//     active: user.isActive,
//     verified: user.isVerified,
//     created: user.createdAt,
//     lastLogin: user.lastLogin
//   };
// };

// const buildJourneyLog = (customer) => {
//   const customerObj = customer.toObject();

//   const meta = buildMeta(customerObj);

//   const journey = Object.entries(customerObj.logs || {})
//     .map(([eventKey, eventData]) => ({
//       event: eventKey,
//       time: eventData.createdAt,
//       ip: eventData.ip,
//       device: eventData.device,
//       data: eventData.data || {}
//     }))
//     .sort((a, b) => new Date(b.time) - new Date(a.time));

//   let logText = "";

// /* ================= META (ONLY ONCE) ================= */
//   logText += `
// ==============================
// CUSTOMER
// ${JSON.stringify(meta, null, 2)}
// ==============================
// `;

// /* ================= JOURNEY ================= */
//   journey.forEach((j) => {
//     logText += `
// ------------------------------
// EVENT : ${j.event}
// TIME  : ${j.time || "N/A"}
// IP    : ${j.ip || "N/A"}
// DEVICE: ${j.device || "N/A"}

// DATA  :
// ${JSON.stringify(j.data, null, 2)}
// `;
//   });

//   return logText;
// };

const buildMeta = (customerObj) => {
  const user = customerObj.userId || {};

  return {
    id: user._id,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    phone: customerObj.phoneNumber,
    type: user.userType,
    platform: user.platform,
    appVersion: user.appVersion,
    active: user.isActive,
    verified: user.isVerified,
    created: user.createdAt,
    lastLogin: user.lastLogin
  };
};

const buildJourneyLog = (customer) => {
  const customerObj = customer.toObject();

  const meta = buildMeta(customerObj);

  const journey = Object.entries(customerObj.logs || {})
    .map(([eventKey, eventData]) => ({
      event: eventKey,
      time: eventData.createdAt,
      ip: eventData.ip,
      device: eventData.device,
      data: eventData.data || {}
    }))
    // 👉 IMPORTANT: OLD → NEW order (flow style)
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  let logText = "";

/* ================= CUSTOMER ================= */
  logText += `
==============================
customer:
${JSON.stringify(meta, null, 2)}
==============================
`;

/* ================= JOURNEY FLOW ================= */
  logText += `
journey:
(1st → last activity)
==============================
`;

  journey.forEach((j, index) => {
    logText += `
step ${index + 1}
event : ${j.event}
time  : ${j.time || "N/A"}
ip    : ${j.ip || "N/A"}
device: ${j.device || "N/A"}

data:
${JSON.stringify(j.data, null, 2)}
------------------------------
`;
  });

  return logText;
};
if (download === "true") {
  const logText = buildJourneyLog(customer);

  res.setHeader("Content-Type", "text/plain");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=customer-${customer.phoneNumber}.log`
  );

  return res.status(200).send(logText);
}

      return res.status(200).json({
        success: true,
        data: formattedData,
      });
    }

    // =========================
    // ALL CUSTOMERS JOURNEY
    // =========================
    const logs = await CustomerLog.find()
      .populate("userId")
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await CustomerLog.countDocuments();

    const formattedLogs = logs.map(formatJourney);

    // Download All Journeys
    if (download === "true") {
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=all-customer-journeys.json"
      );

      return res.status(200).json({
        totalCustomers: total,
        generatedAt: formatIndianDate(new Date()),
        customers: formattedLogs,
      });
    }

    return res.status(200).json({
      success: true,
      totalCustomers: total,
      currentPage: Number(page),
      perPage: Number(limit),
      data: formattedLogs,
    });

  } catch (error) {
    console.error("Get Logs Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// exports.getLogs = async (req, res) => {
//   try {
//     const {
//       userId,
//       phoneNumber,
//       download,
//       page = 1,
//       limit = 20,
//     } = req.query;

//     let query = {};

//     if (userId) {
//       query.userId = userId;
//     }

//     if (phoneNumber) {
//       query.phoneNumber = phoneNumber;
//     }

//     // Single Customer
//     if (userId || phoneNumber) {
//       const customer = await CustomerLog.findOne(query)
//         .populate("userId");

//       if (!customer) {
//         return res.status(404).json({
//           success: false,
//           message: "Customer log not found",
//         });
//       }

//       // Download Single
//       if (download === "true") {
//         return res.setHeader(
//           "Content-Disposition",
//           `attachment; filename=customer-${customer.phoneNumber}.json`
//         ).status(200).json(customer);
//       }

//       return res.status(200).json({
//         success: true,
//         data: customer,
//       });
//     }

//     // All Customers
//     const logs = await CustomerLog.find()
//       .populate("userId")
//       .sort({ updatedAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit));

//     const total = await CustomerLog.countDocuments();

//     // Download All
//     if (download === "true") {
//       return res.setHeader(
//         "Content-Disposition",
//         "attachment; filename=all-customer-journeys.json"
//       ).status(200).json(logs);
//     }

//     return res.status(200).json({
//       success: true,
//       total,
//       page: Number(page),
//       limit: Number(limit),
//       data: logs,
//     });

//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };