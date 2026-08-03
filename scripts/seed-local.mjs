import { LocalStore } from '../src/local/store.mjs';
const store=new LocalStore();store.init();
if(store.listDrops({includePrivate:true}).length===0){store.createDrop({name:'First School Drop',slug:'first-school-drop',month:'',year:2026,headline:'Choose the colors only when the drop is confirmed.',publicNotes:'This drop is still being planned.',privateNotes:'Add confirmed colors, supplies, quantities, and a public note before submitting for review.',colors:[],colorHexes:[],featuredCharm:'',beadedAvailable:true,braidedAvailable:true,quantity:0,schoolPriceCents:200,customPriceCents:300,onlinePriceMinCents:0,onlinePriceMaxCents:0,releaseDate:'',endDate:'',tiktokUrl:'',etsyUrl:'',status:'draft'},{username:'system',role:'system'});}
console.log('Local CharmNest database initialized.');
