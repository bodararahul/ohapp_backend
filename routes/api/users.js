/** 
  * @desc this file will contains the routes for user api
  * @author Navneet Kumar navneet.kumar@subcodevs.com
  * @file users.js
*/

const express = require('express');
const userService = require('../../services/UserService');
const formValidator = require('validator');
const path = require('path');
const customHelper = require('../../helpers/custom_helper');

// JWT web token
const jwt         = require('jsonwebtoken');

const tokenList = {};

// Get API secret
const config      = require('../../config/config');

// verifytoken middleware
const verifyToken = require('./verifytoken');

// Include image upload lib
const multer  =   require('multer');

const multerConf = {
	storage : multer.diskStorage({
		destination: (req, file, next) => {
			next(null, 'public/profile_images')
		},
		filename: function(req, file, next){
			const ext = file.mimetype.split("/")[1];
			next(null, file.fieldname + '-' + Date.now()+'.'+ext);
		}
	}),
	limits: {
        fileSize: 250000
    },
	fileFilter: function(req, file, next){
		
		if(!file)
		{
			next();
		}
		
		const image = file.mimetype.startsWith('image/');

		if(image)
		{
			next(null, true);
		}
		else
		{
			next({message:"Please upload valid file format(jpg, jpeg, png)"}, false);
		}
	}
};

var uploadObject = multer(multerConf).single('user_photo');

// Create route object
let router =  express.Router();

// Create user model object
var userSerObject = new userService();

// Get user detail
router.get('/getuserdetail/:user_id', verifyToken, function(req, res, next) {

	let user_id  = req.params.user_id;
	
	if(!user_id) 
	{
		return res.send({
			status: 400,
			message: 'User Id is required.',
		});
	}

	if(!formValidator.isInt(user_id))   
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid user id.',
		});
	}

	userSerObject.getUserById(user_id, function(err, userData)
	{
		if(err)
		{
			res.send({
				status: 500,
				message: 'There was a problem finding the user.',
			});
		}
		else
		{
			if(userData)
			{
				let userDetail = {
					'first_name': userData.first_name,
					'last_name': userData.last_name,
					'email': userData.email,
					'role_id': userData.role_id,
					'gender': userData.gender,
					'image_profile': userData.image_profile,
					'status': userData.status
				};

				res.send({
					status: 200,
					result: userDetail,
				});
			}
			else
			{
				res.send({
					status: 404,
					message: 'No user found.',
				});
			}	
		}
	});
});

// New user registration API
router.post('/register', function(req, res){

	let first_name = req.body.first_name;
	let last_name  = req.body.last_name;
	let gender     = req.body.gender;
	let email      = req.body.email;
	let password = req.body.password;
	let confirm_password     = req.body.confirm_password;
	let role_id  = 2;
	let status   = 1;

	if(!first_name) 
	{
		return res.send({
			status: 400,
			message: 'First name is required',
		});
	}
 
	if(!formValidator.isAlpha(first_name,['en-US']))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid first name',
		});
	}

	if(!last_name) 
	{
		return res.send({
			status: 400,
			message: 'Last name is required',
		});
	}
 
	if(!formValidator.isAlpha(last_name,['en-US']))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid last name',
		});
	}

	if(!gender) 
	{
		return res.send({
			status: 400,
			message: 'Gender is required.',
		});
	}
 
	if(!formValidator.isAlpha(gender,['en-US']))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid gender value(Male/Female).',
		});
	}

	if(!email) 
	{
		return res.send({
			status: 400,
			message: 'Email is required',
		});
	}
 
	if(!formValidator.isEmail(email))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid email',
		});
	}

	if(!password) 
	{
		return res.send({
			status: 400,
			message: 'Password is required',
		});
	}

	if(!confirm_password) 
	{
		return res.send({
			status: 400,
			message: 'Confirm password is required',
		});
	}

	if(password!=confirm_password) 
	{
		return res.send({
			status: 400,
			message: 'Password and confirm password should be same.',
		});
	}

	let userData = {
		'role_id': role_id,
		'first_name': first_name,
		'last_name': last_name,
		'gender': gender,
		'email': email.toLowerCase(),
		'password': password,
		'status': status
	};

	userSerObject.getUserByEmail(email, function(err, user) 
	{
		if(err)
		{
			res.send({
				status: 500,
				message: 'something went wrong',
			});
		}
		else
		{
			if(user) 
			{
				return res.send({
					status: 405,
					message: 'Email-Id already exists: '+email,
				});
			}
			else
			{
				userSerObject.createUser(userData, function(err, userData)
				{
					if(err)
					{
						res.send({
							status: 500,
							message: 'something went wrong',
						});
					}
					else
					{
						var token = jwt.sign({ id: userData.id }, config.secret, {
							expiresIn: 900 // expires in 24 hours (86400)
						});

						var refreshToken = jwt.sign({ id: userData.id }, config.refreshsecret, { 
							expiresIn: 86400 
						});

						const custom_response = {
							status: 200,
							message: 'success',
							result: userData,
							token: token,
							refreshToken: refreshToken,
						}
						
						tokenList[refreshToken] = custom_response;

						res.send(custom_response);
					}
				});
			}
		}
	});
});

// User login API
router.post('/login', function(req, res) {

	let email    = req.body.email;
	let password = req.body.password;

	if(!email) 
	{
		return res.send({
			status: 400,
			message: 'Email is required',
		});
	}
 
	if(!formValidator.isEmail(email))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid email',
		});
	}

	if(!password) 
	{
		return res.send({
			status: 400,
			message: 'Password is required',
		});
	}

	let userData = {
		'email': email,
		'password': password,
	};

	userSerObject.getUserByEmail(email, function(err, user) 
	{
		if(err)
		{
			res.send({
				status: 500,
				message: 'something went wrong',
			});
		}
		else
		{
			if(user) 
			{
				userSerObject.comparePassword(password, user.password, function(err, isMatch) 
				{
					if(err)
					{
						res.send({
							status: 500,
							message: 'something went wrong',
						});
					}

					if(isMatch)
					{
						var token = jwt.sign({ id: user.id }, config.secret, {
							expiresIn: 900 // expires in 24 hours (86400)
						});

						var refreshToken = jwt.sign({ id: user.id }, config.refreshsecret, { 
							expiresIn: 86400 
						});

						const custom_response = {
							status: 200,
							message: 'success',
							token: token,
							refreshToken: refreshToken,
						}
						
						tokenList[refreshToken] = custom_response;

						res.send(custom_response);
					}
					else
					{
						return res.send({
							status: 401,
							message: 'Invalid email or password.',
							auth: false, 
							token: null
						});
					}
				});
			}
			else
			{
				return res.send({
					status: 400,
					message: 'No user found',
				});
			}
		}
	});
});

// update user profile API
router.post('/profileupdate', verifyToken, function(req, res, next) {

	let user_id  = req.body.user_id;
	let first_name = req.body.first_name;
	let last_name = req.body.last_name;

	if(!user_id) 
	{
		return res.send({
			status: 400,
			message: 'User Id is required.',
		});
	}

	if(!formValidator.isInt(user_id))   
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid user id.',
		});
	}

	if(!first_name) 
	{
		return res.send({
			status: 400,
			message: 'First name is required',
		});
	}
 
	if(!formValidator.isAlpha(first_name,['en-US']))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid first name',
		});
	}

	if(!last_name) 
	{
		return res.send({
			status: 400,
			message: 'Last name is required',
		});
	}
 
	if(!formValidator.isAlpha(last_name,['en-US']))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid last name',
		});
	}

	let userData = {
		'user_id': user_id,
		'first_name': first_name,
		'last_name': last_name,
	};

	userSerObject.updateUserProfile(userData, function(err, userData)
	{
		if(err)
		{
			res.send({
				status: 500,
				message: 'There was a problem finding the user.',
			});
		}
		else
		{
			if(userData)
			{
				res.send({
					status: 200,
					message: 'Profile updated successfully',
				});
			}
			else
			{
				res.send({
					status: 404,
					message: 'No user found.',
				});
			}	
		}
	});
});

// JWT Refresh Token API
router.post('/refreshtoken', (req,res) => {
    
	const postData = req.body;

	if(!postData.id) 
	{
		return res.send({
			status: 400,
			message: 'User Id is required.',
		});
	}

	if(!formValidator.isInt(postData.id))   
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid user id.',
		});
	}

	if(!postData.refreshToken) 
	{
		return res.send({
			status: 400,
			message: 'Please provide a valid refresh token.',
		});
	}

    if((postData.refreshToken) && (postData.refreshToken in tokenList)) {

		var token = jwt.sign({ id: postData.id }, config.secret, {
			expiresIn: 900
		});

		const custom_response = {
			status: 200,
			message: 'success',
			token: token
		}
		
		tokenList[postData.refreshToken].token = token;

		res.send(custom_response);
	}
	else 
	{	
		res.send({
			status: 404,
			message: 'Invalid request',
		});
    }
});

// Get Forgot Password Email API
router.post('/forgotpasswordemail', function(req, res) {

	let email    = req.body.email;

	if(!email) 
	{
		return res.send({
			status: 400,
			message: 'Email is required',
		});
	}
 
	if(!formValidator.isEmail(email))
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid email',
		});
	}

	let userData = {
		'email': email,
	};

	userSerObject.getUserByEmail(email, function(err, userData) 
	{
		if(err)
		{
			res.send({
				status: 500,
				message: 'something went wrong',
			});
		}
		else
		{
			if(userData) 
			{

				let userDataWithtoken = {
					'email': email
				};

				userSerObject.sendForgotEmail(userDataWithtoken, function(err, userData) 
				{
					if(err)
					{
						res.send({
							status: 500,
							message: 'something went wrong',
						});
					}

					if(userData)
					{	
						res.send({
							status: 200,
							message: 'A new password has been sent to your email-id.',
						});
					}
					else
					{
						res.send({
							status: 404,
							message: 'No user found.',
						});
					}
				});
			}
			else
			{
				return res.send({
					status: 400,
					message: 'No user found',
				});
			}
		}
	});
});

// Get Change Password API
router.post('/changepassword', verifyToken, function(req, res) {

	let user_id  = req.body.user_id;
	let new_password  = req.body.new_password;
	let confirm_password = req.body.confirm_password;

	if(!user_id) 
	{
		return res.send({
			status: 400,
			message: 'User Id is required.',
		});
	}

	if(!formValidator.isInt(user_id))   
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid user id.',
		});
	}

	if(!new_password) 
	{
		return res.send({
			status: 400,
			message: 'New password is required',
		});
	}

	if(!confirm_password) 
	{
		return res.send({
			status: 400,
			message: 'Confirm password is required',
		});
	}

	if(new_password!=confirm_password) 
	{
		return res.send({
			status: 400,
			message: 'New password and confirm password should be same.',
		});
	}

	let userData = {
		'user_id': user_id,
		'new_password': new_password,
		'confirm_password': confirm_password,
	};

	userSerObject.getUserById(user_id, function(err, userData) 
	{
		if(err)
		{
			res.send({
				status: 500,
				message: 'something went wrong',
			});
		}
		else
		{
			if(userData) 
			{
				let userDataUpdate = {
					'user_id': user_id,
					'new_password': new_password,
					'confirm_password': confirm_password,
				};

				userSerObject.updateUserPassword(userDataUpdate, function(err, userDataUpdate) 
				{
					if(err)
					{
						res.send({
							status: 500,
							message: 'something went wrong in update the password.',
						});
					}

					if(userDataUpdate)
					{			
						res.send({
							status: 200,
							message: 'Password updated successfully.',
						});
					}
					else
					{
						res.send({
							status: 404,
							message: 'No user found.',
						});
					}
				});
			}
			else
			{
				return res.send({
					status: 400,
					message: 'No user found',
				});
			}
		}
	});
});

// Set Unavailability API
router.post('/unavailability', verifyToken, function(req, res) {

	let user_id  = req.body.user_id;
	let unavailability_start  = new Date(req.body.unavailability_start).getTime();
	let unavailability_end    = new Date(req.body.unavailability_end).getTime();

	if(!user_id) 
	{
		return res.send({
			status: 400,
			message: 'User Id is required.',
		});
	}

	if(!formValidator.isInt(user_id))   
	{
		return res.send({
			status: 400,
			message: 'Please enter a valid user id.',
		});
	}

	if(!unavailability_start) 
	{
		return res.send({
			status: 400,
			message: 'Unavailability start is required',
		});
	}

	if(!unavailability_end) 
	{
		return res.send({
			status: 400,
			message: 'Unavailability end is required',
		});
	}

	if(BigInt(unavailability_start) <= BigInt(customHelper.h_getTodayDateInTimeStamp())) 
	{
		return res.send({
			status: 400,
			message: 'Unavailability start time should be greater than current time.',
		});
	}

	if(BigInt(unavailability_end) <= BigInt(customHelper.h_getTodayDateInTimeStamp())) 
	{
		return res.send({
			status: 400,
			message: 'Unavailability end time should be greater than current time.',
		});
	}

	if(BigInt(unavailability_start) >= BigInt(unavailability_end)) 
	{
		return res.send({
			status: 400,
			message: 'Unavailability start time should be greater than unavailability end time.',
		});
	}

	userSerObject.getUserById(user_id, function(err, userDataResponse) 
	{
		if(err)
		{
			res.send({
				status: 500,
				message: 'something went wrong',
			});
		}
		else
		{
			if(userDataResponse) 
			{
				let userData = {
					'user_id': req.body.user_id,
					'unavailability_start': req.body.unavailability_start,
					'unavailability_end': req.body.unavailability_end,
				};

				userSerObject.addUnavailability(userData, function(err, userSaveData) 
				{
					if(err)
					{
						res.send({
							status: 500,
							message: 'something went wrong to add new record.',
						});
					}

					if(userSaveData)
					{			
						res.send({
							status: 200,
							message: 'Record added successfully.',
						});
					}
					else
					{
						res.send({
							status: 404,
							message: 'something went wrong to add new record.',
						});
					}
				});
			}
			else
			{
				return res.send({
					status: 400,
					message: 'No user found',
				});
			}
		}
	});
});

// User logout
router.get('/logout', function(req, res){
	res.send({
		status: 200,
		message: 'success',
		auth: false,
		token: null
	});
});


// Update profile image
router.post('/profileimageupdate', verifyToken, (req, res, next) => {

	uploadObject(req, res, function(err) {

		if(err) 
		{
			res.send({
				status: 500,
				message: err.message,
			});
		}
		else
		{
			let upload_file  = req.file;
			let user_id  = req.id;

			let userImageData = {
				'user_id': user_id,
				'upload_file': upload_file.filename,
			};
	
			userSerObject.updateProfileImage(userImageData, function(err, userImageData)
			{
				if(err)
				{
					res.send({
						status: 500,
						message: 'Error uploading file.',
					});
				}
				else
				{
					if(userImageData)
					{
						res.send({
							status: 200,
							message: 'Image uploaded successfully.',
							image_name: upload_file.filename
						});
					}
					else
					{
						res.send({
							status: 404,
							message: 'Error occured in image upload.',
						});
					}	
				}
			});
		}
	});
});

module.exports = router;