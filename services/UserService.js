
/** 
  * @desc this service file will define all the functions related to the user
  * @author Navneet Kumar navneet.kumar@subcodevs.com
  * @file UserService.js
*/

const userObject = require('../models/user');
const unavailabilityObject = require('../models/unavailabilities');
const partnerMappingObject   = require('../models/partner_mappings');
const dbObj      = require('../config/database');
const config     = require('../config/config');
const bcrypt     = require('bcryptjs');
const current_datetime = require('date-and-time');

const randomstring = require("randomstring");
const fs = require('fs');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

const Sequelize = require('sequelize');
const Op = Sequelize.Op

class UserService
{
	// Generate unique code
	async generateUniqueCode(){

		var u_code = randomstring.generate({
			length: 4,
			charset: 'alphabetic',
			capitalization: 'uppercase'
		});

		const user = await userObject.findOne({ where: { unique_code: u_code } });

		if(user)
		{
			return this.generateUniqueCode(); 
		}
		else
		{
			return u_code;    
		}
	}

	// Create new user
	async createUser(newUser, callback){

		const u_code = await this.generateUniqueCode();

		if(u_code)
		{
			const now = new Date();

			var user_password = randomstring.generate(8);

			let userData = new userObject({
				role_id: newUser.role_id,
				first_name: newUser.first_name,
				last_name: newUser.last_name,
				gender: newUser.gender,
				email: newUser.email.toLowerCase(),
				password: user_password,
				unique_code: u_code,
				status: newUser.status,
				create_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss'),
				update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss')
			});
	
			bcrypt.genSalt(10, function(err, salt) {
				bcrypt.hash(userData.password, salt, function(err, hash) {
					userData.password = hash;
	
					//*******  Email Code
					var readHTMLFile = function(path, callback) {
						fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
							if (err) {
								throw err;
								callback(err);
							}
							else {
								callback(null, html);
							}
						});
					};
			
					var transporter = nodemailer.createTransport({
						service: config.email_service,
						port: 587,
						secure: false,
						auth: {
							user: config.gmail_id,
							pass: config.gmail_password
						}
					});
			
					readHTMLFile(config.signup_template, function(err, html) {
						var template = handlebars.compile(html);
						var replacements = {
							username: newUser.first_name,
							user_email: newUser.email,
							user_password: user_password,
							site_logo: config.site_logo,
						};
						var htmlToSend = template(replacements);
			
						var mailOptions = {
							from: '"OH Team" <'+config.from_email+'>',
							to: newUser.email,
							subject: 'OH :: SignUp Email',
							html : htmlToSend
						}
			
						transporter.sendMail(mailOptions, function (error, info) {
							if (error) {
							console.log(error);
							} else {
							console.log('Email sent: ' + info.response);
							}
						});
					});
					//*******  Email Code
	
					userData.save().then(function(saveData) {
						callback(null,saveData);
					})

					// callback(null,userData.save());
				});
			});
		}
    }

	// get user by email
	async getUserByEmail(email, callback){
		const user = await userObject.findOne({ where: { email: email.toLowerCase() } });
		callback(null,user);
	}

	// check unique code of the user
	async checkUniqueCode(u_code, callback){
		const unique_code = await userObject.findOne({ where: { unique_code: u_code } });
		callback(null,unique_code);
	}

	// compare password
	async comparePassword(password, hash, callback){
		bcrypt.compare(password, hash, function(err, isMatch){
			if(err) throw err;
			callback(null, isMatch);
		});
	}
	
	// get user by id
	async getUserById(id, callback) {
		const response = await userObject.findOne({ where: { id: id } });
		callback(null, response);
	}

	// get partner by id
	async getPartnerById(id, callback) {
		var partner_id = 0;
		const partnerResponse = await partnerMappingObject.findAll({ where: { 
			    [Op.or]: [
				  {
					partner_one_id: {
						[Op.eq]: id
					}
				  },
				  {
					partner_two_id: {
						[Op.eq]: id
					}
				  }
				],
				[Op.and]: [
					{
					  status: {
						  [Op.eq]: 1
					  }
					},
				]	
			}});

		if(partnerResponse[0].partner_one_id==id)	
		{
			partner_id = partnerResponse[0].partner_two_id;
		}

		if(partnerResponse[0].partner_two_id==id)	
		{
			partner_id = partnerResponse[0].partner_one_id;
		}

		const response  = await userObject.findOne({ where: { id: partner_id } });
		callback(null, response);
	}
	
	// send forgot password email
	async sendForgotEmail(userData, callback){

		var new_password = randomstring.generate(8);
		var user_detail = await userObject.findOne({ where: { email: userData.email } });

		var readHTMLFile = function(path, callback) {
			fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
				if (err) {
					throw err;
					callback(err);
				}
				else {
					callback(null, html);
				}
			});
		};

		var transporter = nodemailer.createTransport({
			service: config.email_service,
			port: 587,
			secure: false,
			auth: {
				user: config.gmail_id,
				pass: config.gmail_password
			}
		});


		readHTMLFile(config.forgot_password_template, function(err, html) {
			var template = handlebars.compile(html);
			var replacements = {
				username: user_detail.first_name,
				user_email: user_detail.email,
				new_password: new_password,
				site_url: config.site_url,
				site_logo: config.site_logo,
			};
			var htmlToSend = template(replacements);

			var mailOptions = {
				from: '"OH Team" <'+config.from_email+'>',
				to: userData.email,
				subject: 'OH :: Forgot Password Email',
				html : htmlToSend
			}

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
				console.log(error);
				} else {
				console.log('Email sent: ' + info.response +' >> '+new_password);
				}
			});
		});

		bcrypt.genSalt(10, function(err, salt) {
			bcrypt.hash(new_password, salt, function(err, hash) {
				const now = new Date();
				callback(null, userObject.update({ password: hash, update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss') }, { where: { email: userData.email }}));
			});
		});
	}

	// update user profile
	async updateUserProfile(userData, callback){
		const now = new Date();
		callback(null, userObject.update({ first_name:  userData.first_name, last_name:  userData.last_name, update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss') }, { where: { id: userData.user_id }}) );
	}

	// update user fcmid
	async updateUserFcmID(userFcmIDData, callback){
		const now = new Date();
		callback(null, userObject.update({ fcmid: userFcmIDData.fcmid, update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss') }, { where: { id: userFcmIDData.user_id }}) );
	}

	// update user profile image
	async updateProfileImage(userImage, callback){
		const now = new Date();	
		callback(null, userObject.update({ profile_image: userImage.upload_file, update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss') }, { where: { id: userImage.user_id }}) );
	}

	// update user password
	async updateUserPassword(userDataUpdate, callback){
		bcrypt.genSalt(10, function(err, salt) {
			bcrypt.hash(userDataUpdate.new_password, salt, function(err, hash) {
				const now = new Date();
				callback(null, userObject.update({ password: hash, update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss') }, { where: { id: userDataUpdate.user_id }}));
			});
		});
	}

	//to  show list of users
	async getuserList(paginationData ,callback){
		const response = await userObject.findAndCountAll({offset: paginationData.offset, limit: paginationData.limit});
		callback(null,response);
	}

	// add unavailability
	async addUnavailability(userData, callback){

		const now = new Date();

		let userDataEntry = new unavailabilityObject({
			user_id: userData.user_id,
			unavailability_start: userData.unavailability_start,
			unavailability_end: userData.unavailability_end,
			status: 1,
			create_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss'),
			update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss')
		});

		callback(null,userDataEntry.save());
	}

	// free security codes
	async freeSecurityCodes(freeData, callback){
		const now = new Date();
		userObject.update({ unique_code:  ''}, { where: { id: freeData.partner_one_id }});
		callback(null, userObject.update({ unique_code:  ''}, { where: { id: freeData.partner_two_id }}));
	}

	// get user list for cron job.
	async getCronJobUserList(callback){
		const userlist = await userObject.findAll({ where: { unique_code: { [Op.ne]: ""}, role_id:2, status:1 } });
		callback(null,userlist);
	}

	// free security codes for cron
	async freeSecurityCodesForCron(userData, callback){
		const now = new Date();
		callback(null, userObject.update({ unique_code: '', update_time: current_datetime.format(now, 'YYYY-MM-DD hh:mm:ss') }, { where: { id: userData.user_id }}));
	}
}

module.exports = UserService;




