import {plans} from '../app/subscription-plans';

// Hosted PayPal payments supplied for each pack. Neither the URL nor the
// amount is accepted from checkout input.
const hostedButtons = {
 sprint:'9V88R3WTPU4PS',
 intensif:'PZMUSTBZ6QGSL',
 performance:'WXGAA5VBZCXBQ',
} as const;

export function paypalPayment(plan:unknown){
 if(typeof plan!=='string'||!Object.hasOwn(hostedButtons,plan))return null;
 const pack=plans.find(pack=>pack.id===plan)!;
 const hostedButtonId=hostedButtons[plan as keyof typeof hostedButtons];
 return {provider:'paypal',plan:pack.id,name:pack.name,amount:Number(pack.price).toFixed(2),currency:'USD',hostedButtonId,url:'https://www.paypal.com/ncp/payment/'+hostedButtonId};
}

export const paypalPayments=plans.map(pack=>paypalPayment(pack.id)!);
