import Salon from '../models/Salon.js';

export const getAllSalons = async (req, res) => {
  try {
    const salons = await Salon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: salons.length, salons });
  } catch (error) {
    console.error('Get Salons Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getSalon = async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }
    res.status(200).json({ success: true, salon });
  } catch (error) {
    console.error('Get Salon Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createSalon = async (req, res) => {
  try {
    const salon = await Salon.create(req.body);
    res.status(201).json({ success: true, message: 'Salon created successfully', salon });
  } catch (error) {
    console.error('Create Salon Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateSalon = async (req, res) => {
  try {
    const salon = await Salon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }
    res.status(200).json({ success: true, message: 'Salon updated successfully', salon });
  } catch (error) {
    console.error('Update Salon Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteSalon = async (req, res) => {
  try {
    const salon = await Salon.findByIdAndDelete(req.params.id);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }
    res.status(200).json({ success: true, message: 'Salon deleted successfully' });
  } catch (error) {
    console.error('Delete Salon Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
