import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog, parseEther } from 'frog';
import { handle } from 'frog/vercel';
import { encodeAbiParameters, Address } from 'viem';
import { devtools } from 'frog/dev';
import { serve } from '@hono/node-server';
import { getFarcasterUserInfo } from '../lib/neynar.js';
import { vars } from '../lib/ui.js';
import { zora1155Implementation } from '../lib/abi/zora1155Implementation.js';
import { dbapi } from '../lib/dbapi.js';
// import { zora } from 'viem/chains';
import { publicClient } from '../lib/contracts.js';
import { SHARE_INTENT, SHARE_TEXT, SHARE_NFT_TEXT, SHARE_EMBEDS, FRAME_URL, ZORA_EXPLORER } from '../utils/links.js';
import getUri from '../lib/zora/getUri.js';
import getLink from '../lib/metadata/getLink.js';
import getNextTokenId from '../lib/zora/getNextTokenId.js';

const minter = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a'; //minting rules
const quantity = 1n;

const title = 'edpon';

export const app = new Frog({
  title,
  assetsPath: '/',
  basePath: '/api',
  // browserLocation: '/',
  ui: { vars },
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
      <Button.Link href={`https://edpon-front.vercel.app`}>DAPP</Button.Link>,
      <Button action='/verify/0'>PLAY 🕹️</Button>,
      <Button.Link href={`${SHARE_INTENT}${SHARE_TEXT}${SHARE_EMBEDS}${FRAME_URL}`}>CAST</Button.Link>,
    ],

  })
})

// Verify Farcaster fid 
app.frame('/verify/:id', async (c) => {
  if (c.frameData?.fid) {
    const { verifiedAddresses } = await getFarcasterUserInfo(c.frameData?.fid);
    if (!verifiedAddresses || verifiedAddresses.length === 0) {
      return c.res({
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
  const collectionAddress = currentCollection.ArtCollectionAddress as Address; //fix backend
  const numOfNFTs = parseInt((await getNextTokenId(collectionAddress)).toString());
  const tokenId = Math.floor(Math.random() * (numOfNFTs - 1)) + 1;

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
          // backgroundImage: "url(https://i.imgur.com/wC80Bg7.jpeg)",
          backgroundImage: "url(https://i.imgur.com/E2xxGOp.jpeg)", //the best one??
          // backgroundImage: "url(https://i.imgur.com/vEZHUxh.jpeg)",
          fontSize: 70,
          // backgroundSize: "cover",
          backgroundPosition: 'center',
          height: "100%",
          width: "100%",
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
          // letterSpacing: -2,
          // fontWeight: 700,
          overflow: 'hidden',
        }}
      >
        <p style={{
          margin: 0,
        }}>{collectionName}</p>
        <p style={{
          color: 'white',
          fontSize: 40,
          margin: 0,
        }}
        >{artistName}</p>
      </div>
    ),
    imageAspectRatio: '1:1',
    intents: [
      <Button action={`/verify/${boundedIndex === 0 ? (collections.length - 1) : (boundedIndex - 1)}`}>⬅️</Button>,
      <Button action={`/verify/${(boundedIndex + 1) % collections.length}`}>➡️</Button>,
      <Button.Transaction action={`/loading/${collectionAddress}/${tokenId}/0`} target={`/mint/${collectionAddress}/${tokenId}`}>⚡MINT</Button.Transaction>,
    ],
  })
});


app.transaction('/mint/:collection/:tokenId', async (c) => {
  const collection = c.req.param('collection') as `0x${string}`;
  const tokenId = c.req.param('tokenId');

  const verifiedAddresses =
    (c.previousState as any).verifiedAddresses && (c.previousState as any).verifiedAddresses.length > 0
      ? (c.previousState as any).verifiedAddresses
      : ((c.previousState as any).verifiedAddresses = await getFarcasterUserInfo(c.frameData?.fid));

  const minterArguments = encodeAbiParameters(
    [
      { name: 'mintTo', type: 'address' },
      { name: 'comment', type: 'string' },
    ],
    [verifiedAddresses[0], `Collected from EDPON Frame`],
  );

  const rewardsRecipients = ['0xC1bd4Aa0a9ca600FaF690ae4aB67F15805d8b3A1'] as Address[];

  return c.contract({
    abi: zora1155Implementation,
    // chainId: `eip155:${zora.id}`,
    chainId: `eip155:11155111`,
    // functionName: 'mintWithRewards', //change to mint and add create referral
    functionName: 'mint',
    args: [
      minter,
      BigInt(tokenId),
      quantity,
      rewardsRecipients, //refferral address
      minterArguments,
    ],
    to: collection,
    value: parseEther('0.000777'), //free mint value
  })
})

app.frame('/loading/:collection/:tokenId/:txId/', async (c) => {
  const prevTxId = c.req.param('txId');
  const collection = c.req.param('collection') as `0x${string}`;
  const tokenId = c.req.param('tokenId');

  let transactionReceipt;

  if (c.transactionId === undefined && prevTxId === undefined) return c.error({ message: 'No txId' });

  if (prevTxId !== '0') {
    c.transactionId = prevTxId as Address;
  }

  try {
    transactionReceipt = await publicClient.getTransactionReceipt({
      hash: prevTxId as Address,
    });
    if (transactionReceipt && transactionReceipt.status == 'reverted') {
      return c.error({ message: 'Transaction failed' });
    }
  } catch (error) {
    console.log(error)
  }

  if (transactionReceipt?.status === 'success') {
    return c.res({
      title,
      image: `/pokeball.gif`,
      imageAspectRatio: '1:1',
      intents: [
        <Button action={`/result/${collection}/${tokenId}/${prevTxId}`}>OPEN CAPSULE</Button>,
      ],
    })
  }
  else {
    return c.res({
      title,
      image: `/loading-screen${Math.floor(Math.random() * 5) + 1}.gif`,
      imageAspectRatio: '1:1',
      intents: [
        <Button action={`/loading/${collection}/${tokenId}/${c.transactionId}`}>REFRESH 🔄️</Button>,
      ],
    })
  }
})

app.frame('/result/:collection/:id/:txId', async (c) => {
  const collection = c.req.param('collection') as `0x${string}`;
  const tokenId = c.req.param('id');
  const txId = c.req.param('txId');

  let image;
  try {
    const uri = await getUri(collection, BigInt(tokenId));
    const urlLink = getLink(uri);
    const response = await fetch(urlLink);
    const data = await response.json();
    const { image: responseImage } = data;
    const src = getLink(responseImage);
    image = {
      src: `${src}`,
    };
  } catch (error) {
    console.log(error);
    image = {
      src: `/errorImg.jpeg`
    };
  }

  return c.res({
    title,
    image: `${image.src || '/errorImg.jpeg'}`,
    imageAspectRatio: '1:1',
    intents: [
      <Button.Link href={`${SHARE_INTENT}${SHARE_NFT_TEXT}${SHARE_EMBEDS}${FRAME_URL}/share/${encodeURIComponent(image.src)}`}>SHARE</Button.Link>,
      <Button.Link href={`${ZORA_EXPLORER}/tx/${txId}`}>CHECK ETHSCAN</Button.Link>,
      <Button.Reset>PLAY AGAIN🕹️</Button.Reset>,
    ],
  })
})

app.frame('/share/:ntfImg', async (c) => {
  const nftImg = c.req.param('nftImg');

  return c.res({
    title,
    image: `${nftImg || '/test.png'}`,
    imageAspectRatio: '1:1',
    intents: [
      <Button.Reset>TRY IT OUT!! 🕹️</Button.Reset>,
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
