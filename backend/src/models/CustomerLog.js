// const mongoose = require("mongoose");

// const CustomerLogSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       unique: true,
//       required: true,
//     },

//     logs: {
//       type: mongoose.Schema.Types.Mixed,
//       default: {},
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("CustomerLog", CustomerLogSchema);


// models/CustomerLog.js

const mongoose = require("mongoose");

const CustomerLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    phoneNumber: {
      type: String,
      default: null,
      index: true,
    },

    logs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CustomerLog", CustomerLogSchema);