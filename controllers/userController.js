const multer = require('multer');
const sharp = require('sharp');

const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

//Defining multer storage and filter object
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, `${__dirname}/../public/img/users`);
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

//saving the image file in buffer initially not on the disk it is more efficient
const multerStorage = multer.memoryStorage();

//we need to only store the files having extension .jpeg
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else
    cb(new AppError('Only image files are allowed to be uploaded', 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
//Usin handler factory function
exports.deleteUser = factory.deleteOne(User);
//this function is only for admin and for updating fields other than password because here save middleware is not called during findByidaAndupdate
exports.updateUser = factory.updateOne(User);
exports.createNewUser = factory.createOne(User);

//this function is only for updating email and name
exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError('This path is not valid for updating password', 400)
    );
  }
  const filteredObj = filterObj(req.body, 'name', 'email');
  if (req.file) filteredObj.photo = req.file.filename;
  const user = await User.findByIdAndUpdate(
    { _id: req.user._id },
    filteredObj,
    {
      new: true
    }
  );

  res.status(200).json({
    status: 'success',
    user
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate({ _id: req.user._id }, { active: false });

  //IF you set the status to 204 then this response will not be send and this is the standard that we do while deleting the user....!
  res.status(204).json({
    data: null
  });
});

exports.resizeUserPhoto = async (req, res, next) => {
  if (!req.file) next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  if (req.file) {
    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`${__dirname}/../public/img/users/${req.file.filename}`);
  }
  next();
};
