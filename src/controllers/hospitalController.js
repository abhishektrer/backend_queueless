import Hospital from '../models/Hospital.js';

// @desc    Get all hospitals
// @route   GET /api/admin/hospitals
// @access  Admin
export const getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    console.error('Get Hospitals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single hospital
// @route   GET /api/admin/hospitals/:id
// @access  Public
export const getHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }
    
    res.status(200).json({
      success: true,
      hospital,
    });
  } catch (error) {
    console.error('Get Hospital Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Create hospital
// @route   POST /api/admin/hospitals
// @access  Admin
export const createHospital = async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Hospital created successfully',
      hospital,
    });
  } catch (error) {
    console.error('Create Hospital Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update hospital
// @route   PUT /api/admin/hospitals/:id
// @access  Admin
export const updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Hospital updated successfully',
      hospital,
    });
  } catch (error) {
    console.error('Update Hospital Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Delete hospital
// @route   DELETE /api/admin/hospitals/:id
// @access  Admin
export const deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Hospital deleted successfully',
    });
  } catch (error) {
    console.error('Delete Hospital Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
