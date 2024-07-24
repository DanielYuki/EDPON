import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog, parseEther} from 'frog';
import { handle } from 'frog/vercel';
import { encodeAbiParameters } from 'viem';
import { devtools } from 'frog/dev';
import { serve } from '@hono/node-server';
import { getFarcasterUserInfo } from '../lib/neynar';
import { vars } from '../lib/ui.js';
import { zora1155Implementation } from '../lib/abi/zora1155Implementation.js';
import { dbapi } from '../lib/dbapi.js';
import { zora } from 'viem/chains';
import { publicClient } from '../lib/contracts.js';

// *****************************************************************************************************
// THIS IMPORT MAY BE USEFUL 
// import { Box, Heading, Text, VStack, vars } from "../lib/ui.js"
// import { parse } from 'postcss';
// import { db, addDoc, collection, updateDoc, doc, getDoc, getDocs } from '../utils/firebaseConfig.js'
// import { collectionsApp } from './collections.js'
// import { verificationsApp } from './verification.js'
//import { neynar } from 'frog/hubs'
// *****************************************************************************************************


const title = 'edpon';
const CUSTOM_COLLECTIONS = '0xe88035cbc6703b18e2899fe2b5f6e435f00ade41';
const minter = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a';
const tokenId = '1'
const quantity = 1n;


export const app = new Frog({
  title,
  assetsPath: '/',
  basePath: '/api',
  // browserLocation: '/',
  ui: { vars },
  // Supply a Hub to enable frame verification.
  //hub: neynar({ apiKey: 'NEYNAR_FROG_FM' })

  initialState: {
    collections: [],
    verifiedAddresses: [],
  },
})

app.use('/*', serveStatic({ root: './public' }))

// Home frame
app.frame('/', (c) => {
  return c.res({
    title,
    image: '/gachamachine.gif',
    imageAspectRatio: '1:1',
    intents: [
      <Button action='/verify/0'>PLAY 🕹️</Button>,
    ],

  })
})

// verify Farcaster fid 
app.frame('/verify/:id', async (c) => {
  if (c.frameData?.fid) {
    const { verifiedAddresses } = await getFarcasterUserInfo(c.frameData?.fid);
    if (!verifiedAddresses || verifiedAddresses.length === 0) {
      return c.res({
        headers: {
          'cache-control': 'max-age=0',
        },
        title,
        image: '/insert-token.gif',
        imageAspectRatio: '1:1',
        intents: [
          <Button action="/">RETURN</Button>,
          <Button.Reset>RESET</Button.Reset>,
        ],
      });
    }
    c.deriveState((prevState: any) => {
      prevState.verifiedAddresses = verifiedAddresses;
    });
  }

  const collectionsInfo = await dbapi.fetchArtCollections() as any

  c.deriveState((prevState: any) => {
    prevState.collections = collectionsInfo as any;
  })

  const index = Number(c.req.param('id'));

  const collections =
    (c.previousState as any).collections && (c.previousState as any).collections.length > 0
      ? (c.previousState as any).collections
      : (await dbapi.fetchArtCollections());

  const boundedIndex = ((index % collections.length) + collections.length) % collections.length;

  const currentCollection = collections[boundedIndex];
  const collectionName = currentCollection.collectionName;
  const artistName = currentCollection.creatorName;

  return c.res({
    title: collectionName,
    image: (
      <div
        style={{
          color: '#81BAEC',
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          // backgroundImage: "url(https://i.imgur.com/IcfnuQ0.png)",
          fontSize: 60,
          backgroundSize: "cover",
          backgroundPosition: 'center',
          height: "100%",
          width: "100%",
          backgroundRepeat: 'no-repeat',
        }}
      >
        <p style={{
          margin: 0,
        }}>{collectionName}</p>
        <p style={{
          color: 'white',
          fontSize: 30,
          margin: 0,
        }}
        >{artistName}</p>
      </div>
    ),
    imageAspectRatio: '1:1',
    intents: [
      <Button action={`/verify/${boundedIndex === 0 ? (collections.length - 1) : (boundedIndex - 1)}`}>⬅️</Button>,
      <Button action={`/verify/${(boundedIndex + 1) % collections.length}`}>➡️</Button>,
      <Button.Transaction action='/loading' target="/mint">Pick! ✅</Button.Transaction>, 
      <Button.Reset>Reset</Button.Reset>,
    ],
  })
});




app.transaction('/mint', async (c) => {
  const verifiedAddresses=
  (c.previousState as any).verifiedAddresses && (c.previousState as any).verifiedAddresses.length > 0
    ? (c.previousState as any).verifiedAddresses
    : ( (c.previousState as any).verifiedAddresses  = await getFarcasterUserInfo(c.frameData?.fid));
    const minterArguments = encodeAbiParameters(
      [
        { name: 'mintTo', type: 'address' },
        { name: 'comment', type: 'string' },
      ],
      [verifiedAddresses[0], `Collected from Kismet Casa's Gachapon Frame`],
    );
   return c.contract({
     abi: zora1155Implementation,
    //  chainId: `eip155:${zora.id}`,
     chainId: 'eip155:11155111',
     functionName: 'mintWithRewards',
     args: [
       minter,
       BigInt(tokenId), 
       quantity,
       minterArguments,
       '0xC1bd4Aa0a9ca600FaF690ae4aB67F15805d8b3A1',
     ],
     to: CUSTOM_COLLECTIONS,
     value: parseEther('0.000777'),
   })
})

app.frame('/loading', async (c) => {

  if (c.transactionId === undefined) return c.error({ message: 'No txId' });
  try {
    const transactionReceipt = await publicClient.getTransactionReceipt({
      hash: c.transactionId,
    });
    if (transactionReceipt && transactionReceipt.status == 'reverted') {
      return c.error({ message: 'Transaction failed' });
    }
  } catch (error) {}

  // const name = c.req.param('name')
  // if ('1'=== name) {
  // return c.res ({
  //   title,
  //   image: '/test.png',
  //   imageAspectRatio: '1:1',
  //   intents: [
  //     <Button action={`/result`}>Refresh</Button>,
  //     <Button.Reset>reset test</Button.Reset>,
  //   ],
  // })
  // }
  
  // if (1 === 1) {
  return c.res ({
    title,
    image: `/pokeball.gif`,
    imageAspectRatio: '1:1',
    intents: [
      <Button action={`/result`}>Check result</Button>,
      <Button.Reset>LOADING SCREEN</Button.Reset>,
    ],
  })
})

app.frame('/result', (c) => {
  return c.res({
    title,
    image: 'ipfs://bafkreic76eahcn2y3uhnoluavl5etndxep5clzqrtjc5tkqblh33qul3pe',
    imageAspectRatio: '1:1',
    intents: [
      <Button action='/'>Back 🕹️</Button>,
    ],

  })
})

if (process.env.NODE_ENV !== 'production') {
  devtools(app, { serveStatic });
}

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 5173 });

console.log(`Server started: ${new Date()} `);

export const GET = handle(app)
export const POST = handle(app)
