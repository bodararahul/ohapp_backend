/** 
  * @desc this file will contains all the routes for web
  * @author Navneet Kumar navneet.kumar@subcodevs.com
  * @file webroutes.js
*/


const express   = require('express');
const appRoutes = express();

const indexRoutes = require('./index');
const userRoutes  = require('./routes/web/users');
const pageRoutes  =   require('./routes/web/pages');


// routes of index
appRoutes.use('/', indexRoutes);
// routes of users
appRoutes.use('/users', userRoutes);
// routes of pages
appRoutes.use('/pages', pageRoutes);

module.exports = appRoutes;
