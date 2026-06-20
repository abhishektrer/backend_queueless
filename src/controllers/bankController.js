import Bank from '../models/Bank.js';

export const getAllBanks = async (req, res) => {
  try {
    const banks = await Bank.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: banks.length, banks });
  } catch (error) {
    console.error('Get Banks Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBank = async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Bank not found' });
    }
    res.status(200).json({ success: true, bank });
  } catch (error) {
    console.error('Get Bank Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createBank = async (req, res) => {
  try {
    const bank = await Bank.create(req.body);
    res.status(201).json({ success: true, message: 'Bank created successfully', bank });
  } catch (error) {
    console.error('Create Bank Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBank = async (req, res) => {
  try {
    const bank = await Bank.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Bank not found' });
    }
    res.status(200).json({ success: true, message: 'Bank updated successfully', bank });
  } catch (error) {
    console.error('Update Bank Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteBank = async (req, res) => {
  try {
    const bank = await Bank.findByIdAndDelete(req.params.id);
    if (!bank) {
      return res.status(404).json({ success: false, message: 'Bank not found' });
    }
    res.status(200).json({ success: true, message: 'Bank deleted successfully' });
  } catch (error) {
    console.error('Delete Bank Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
