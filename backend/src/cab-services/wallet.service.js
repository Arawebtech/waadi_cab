const { Wallet, Transaction, Customer, User } = require('../models');
const AppError = require('../utils/AppError');

async function getOrCreateWallet(ownerId, ownerType) {
  let wallet = await Wallet.findOne({ ownerId, ownerType });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId, ownerType, balance: 0 });
    const Model = ownerType === 'Customer' ? Customer : User ;
    await Model.findByIdAndUpdate(ownerId, { walletId: wallet._id });
  }
  return wallet;
}

async function credit(ownerId, ownerType, amount, bookingId, description) {
  const wallet = await getOrCreateWallet(ownerId, ownerType);
  wallet.balance = Math.round((wallet.balance + amount) * 100) / 100;
  await wallet.save();
  await Transaction.create({
    ownerId,
    ownerType,
    walletId: wallet._id,
    bookingId,
    type: 'credit',
    amount,
    balanceAfter: wallet.balance,
    description,
    status: 'completed',
  });
  return wallet;
}

async function debit(ownerId, ownerType, amount, bookingId, description) {
  const wallet = await getOrCreateWallet(ownerId, ownerType);
  if (wallet.balance < amount) throw new AppError('Insufficient wallet balance', 400);
  wallet.balance = Math.round((wallet.balance - amount) * 100) / 100;
  await wallet.save();
  await Transaction.create({
    ownerId,
    ownerType,
    walletId: wallet._id,
    bookingId,
    type: 'debit',
    amount,
    balanceAfter: wallet.balance,
    description,
    status: 'completed',
  });
  return wallet;
}

async function requestWithdrawal(ownerId, ownerType, amount, bankDetails) {
  const wallet = await getOrCreateWallet(ownerId, ownerType);
  if (wallet.balance < amount) throw new AppError('Insufficient balance', 400);
  wallet.balance -= amount;
  await wallet.save();
  return Transaction.create({
    ownerId,
    ownerType,
    walletId: wallet._id,
    type: 'withdrawal',
    amount,
    balanceAfter: wallet.balance,
    description: 'Withdrawal request',
    status: 'pending',
    reference: JSON.stringify(bankDetails),
  });
}

async function getTransactions(ownerId, ownerType, { page = 1, limit = 20 } = {}) {
  return Transaction.find({ ownerId, ownerType })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}

module.exports = { getOrCreateWallet, credit, debit, requestWithdrawal, getTransactions };
