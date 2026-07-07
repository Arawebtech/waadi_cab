const { BankDetail, User, RiderDocument } = require('../models');
const AppError = require('../utils/AppError');
const { encrypt, decrypt, maskAccountNumber, maskIfsc } = require('../utils/encryption');
const { validateIfsc } = require('../utils/validators');
const auditService = require('./audit.service');

function toMaskedResponse(doc) {
  if (!doc) return null;
  const accountNumber = decrypt(doc.accountNumber);
  const ifsc = decrypt(doc.ifsc);
  return {
    id: doc._id,
    driverId: doc.driverId,
    bankName: doc.bankName,
    branchName: doc.branchName,
    accountHolderName: maskAccountNumber(decrypt(doc.accountHolderName)),
    accountNumber: maskAccountNumber(accountNumber),
    ifsc: maskIfsc(ifsc),
    verificationStatus: doc.verificationStatus,
    verified: doc.verified,
    verifiedAt: doc.verifiedAt,
    rejectReason: doc.rejectReason,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toDecryptedResponse(doc) {
  if (!doc) return null;
  return {
    ...toMaskedResponse(doc),
    accountHolderName: decrypt(doc.accountHolderName),
    accountNumber: decrypt(doc.accountNumber),
    ifsc: decrypt(doc.ifsc),
  };
}

async function getByRiderId(driverId, { decryptFields = false } = {}) {
  const doc = await BankDetail.findOne({ driverId }).lean();
  if (!doc) return null;
  return decryptFields ? toDecryptedResponse(doc) : toMaskedResponse(doc);
}

async function upsertBankDetails(driverId, data) {
  const { accountHolderName, accountNumber, ifsc, bankName, branchName } = data;
  if (!accountHolderName || !accountNumber || !ifsc || !bankName) {
    throw new AppError('Account holder name, account number, IFSC, and bank name are required', 400);
  }

  const ifscCheck = validateIfsc(ifsc);
  if (!ifscCheck.valid) throw new AppError(ifscCheck.message, 422);

  const digits = String(accountNumber).replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 18) {
    throw new AppError('Account number must be 9-18 digits', 422);
  }

  const payload = {
    driverId,
    accountHolderName: encrypt(accountHolderName),
    accountNumber: encrypt(digits),
    ifsc: encrypt(ifsc.toUpperCase()),
    bankName,
    branchName,
    verificationStatus: 'pending',
    verified: false,
    verifiedBy: null,
    verifiedAt: null,
    rejectReason: null,
  };

  const doc = await BankDetail.findOneAndUpdate({ driverId }, payload, { upsert: true, new: true });
  await auditService.log({
    actorType: 'rider',
    actorId: driverId,
    action: 'bank_details_update',
    resource: 'BankDetail',
    resourceId: doc._id,
  });
  return toMaskedResponse(doc.toObject());
}

async function approveBankDetails(driverId, adminId) {
  const doc = await BankDetail.findOneAndUpdate(
    { driverId },
    {
      verificationStatus: 'approved',
      verified: true,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      rejectReason: null,
    },
    { new: true }
  );
  if (!doc) throw new AppError('Bank details not found', 404);
  return toMaskedResponse(doc.toObject());
}

async function rejectBankDetails(driverId, adminId, reason) {
  const doc = await BankDetail.findOneAndUpdate(
    { driverId },
    {
      verificationStatus: 'rejected',
      verified: false,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      rejectReason: reason,
    },
    { new: true }
  );
  if (!doc) throw new AppError('Bank details not found', 404);
  return toMaskedResponse(doc.toObject());
}

async function listAll({ page = 1, limit = 50, verificationStatus, search } = {}) {
  const filter = {};
  if (verificationStatus) filter.verificationStatus = verificationStatus;

  if (search) {
    const riders = await User.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    const riderIds = riders.map((r) => r._id);
    filter.$or = [
      { bankName: { $regex: search, $options: 'i' } },
      { branchName: { $regex: search, $options: 'i' } },
      ...(riderIds.length ? [{ driverId: { $in: riderIds } }] : []),
    ];
  }

  const [docs, total] = await Promise.all([
    BankDetail.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('driverId', 'fullName email phone')
      .populate('verifiedBy', 'name email')
      .lean(),
    BankDetail.countDocuments(filter),
  ]);

  return {
    bankDetails: docs.map((d) => ({
      ...toMaskedResponse(d),
      rider: d.driverId,
    })),
    total,
    page,
    limit,
  };
}

const BANK_SUPPORTING_DOC_TYPES = ['pan', 'aadhaar_front', 'aadhaar_back', 'selfie'];

async function getByRiderIdForAdmin(driverId) {
  const doc = await BankDetail.findOne({ driverId })
    .populate('driverId', 'fullName email phone city verificationStatus')
    .populate('verifiedBy', 'name email')
    .lean();
  if (!doc) throw new AppError('Bank details not found', 404);

  const supportingDocuments = await RiderDocument.find({
    driverId,
    docType: { $in: BANK_SUPPORTING_DOC_TYPES },
  })
    .sort({ docType: 1 })
    .lean();

  return {
    bank: toDecryptedResponse(doc),
    rider: doc.driverId,
    supportingDocuments,
  };
}

module.exports = {
  getByRiderId,
  upsertBankDetails,
  approveBankDetails,
  rejectBankDetails,
  listAll,
  getByRiderIdForAdmin,
  toMaskedResponse,
  toDecryptedResponse,
};
