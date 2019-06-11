import nodemailer from 'nodemailer';

const get_prod_auth = () => ({
  user: process.env.PROD_EMAIL_USER,
  pass: process.env.PROD_EMAIL_PASS,
});

const get_dev_auth = async () => await nodemailer.createTestAccount();

const get_auth = async () => {
  if (process.env.IS_PROD_SERVER){
    return get_prod_account();
  } else {
    return await get_dev_account();
  }
};


const get_host = () => process.env.IS_PROD_SERVER ? process.env.PROD_HOST : "smtp.ethereal.email";


const get_port_and_secure_flag = () => (
  process.env.IS_PROD_SERVER ?
    {
      port: 465,
      secure: true,
    } : 
    {
      port: 587,
      secure: false,
    }
);


const get_transport_config = async () => ({
  host: get_host,
  ... get_port_and_secure_flag(),
  auth: await get_auth(),
});

export { get_transport_config };