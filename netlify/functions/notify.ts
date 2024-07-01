import type { Handler, HandlerContext, HandlerEvent } from "@netlify/functions";
import { CourierClient } from "@trycourier/courier";

// Define the request body type
type requestBody = {
  idempotencyKey: string;
  email: string;
  phone: string;
  amount: string;
  payer: string;
};

// Define the handler function
const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Log the event details
  console.log("Received event:", JSON.stringify(event, null, 2));

  // Check if the HTTP method is POST
  if (event.httpMethod !== "POST") {
    console.log("Invalid HTTP method:", event.httpMethod);
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  // Check if the event body exists
  if (!event.body) {
    console.log("No event body");
    return {
      statusCode: 400,
      body: "Bad Request",
    };
  }

  let body: requestBody;
  try {
    // Parse the event body
    body = JSON.parse(event.body);
    console.log("Parsed body:", body);
  } catch (error) {
    console.error("Error parsing body:", error);
    return {
      statusCode: 400,
      body: "Invalid request body",
    };
  }

  // Convert the amount to a number and adjust its scale
  let amount = Number.parseInt(body.amount);
  if (isNaN(amount)) {
    console.log("Invalid amount:", body.amount);
    return {
      statusCode: 400,
      body: "Invalid amount",
    };
  }
  amount = amount * Math.pow(10, -9);
  console.log("Converted amount:", amount);

  // Initialize the Courier client
  const courier = CourierClient({
    authorizationToken: process.env.COURIER_AUTH_TOKEN,
  });
  console.log("Courier client initialized");

  // Initialize an array to store the responses
  const responses = [];

  // If an email is provided, send an email
  if (body.email) {
    try {
      const { requestId } = await courier.send(
        {
          message: {
            to: {
              email: body.email,
            },
            template: "D50G0113M2MTAMHQHC359F5TPMVV",
            data: {
              amount: amount.toFixed(9).replace(/0+$/, ""),
              payer: body.payer,
            },
          },
        },
        {
          idempotencyKey: body.idempotencyKey + "-email",
        }
      );
      responses.push(requestId);
      console.log(`Email sent to ${body.email} with requestId: ${requestId}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  // If a phone number is provided, send an SMS
  if (body.phone) {
    try {
      const { requestId } = await courier.send(
        {
          message: {
            to: {
              phone_number: body.phone,
            },
            template: "3X4D3DD3J5MBS6GPS5K2ZHESK3HW",
            data: {
              amount: amount.toFixed(9).replace(/0+$/, ""),
              payer: body.payer,
            },
          },
        },
        {
          idempotencyKey: body.idempotencyKey + "-sms",
        }
      );
      responses.push(requestId);
      console.log(`SMS sent to ${body.phone} with requestId: ${requestId}`);
    } catch (error) {
      console.error("Error sending SMS:", error);
    }
  }

  // Return the responses
  console.log("Responses:", responses);
  return {
    statusCode: 200,
    body: JSON.stringify(responses),
  };
};

export { handler };
