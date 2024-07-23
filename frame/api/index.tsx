import { serveStatic } from '@hono/node-server/serve-static'
import { Button, Frog, TextInput, parseEther} from 'frog'
//import { neynar } from 'frog/hubs'
import { handle } from 'frog/vercel'
import { devtools } from 'frog/dev';
import { serve } from '@hono/node-server';
import { getFarcasterUserInfo } from '../lib/neynar.js';
import { vars } from "../lib/ui.js"

// import { db, addDoc, collection, updateDoc, doc, getDoc, getDocs } from '../utils/firebaseConfig.js'

// import { dbapi } from '../lib/dbapi.js';

// import { collectionsApp } from './collections.js'
// import { verificationsApp } from './verification.js'

const title = 'edpon';

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

app.frame('/', (c) => {
  return c.res({
    title,
    image: '/gachamachine.gif',
    imageAspectRatio: '1:1',
    intents: [
      <Button action='/verify'>PLAY 🕹️</Button>,
    ],

  })
})

app.frame('/verify', async (c) => {
  // 397059
  // c.frameData?.fid
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

  // console.log(collectionsInfo)

  return c.res({
    title,
    image: '/collectionPicker.png',
    imageAspectRatio: '1:1',
    intents: [
      <Button action="/collections/0">Search Collection</Button>,
      <Button action="/dbtest">db test</Button>,
      <Button.Reset>RESET</Button.Reset>,
    ],
  });
});

app.frame('/collections/:id', async (c) => {
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
      <TextInput placeholder="Value (ETH)" />,
      <Button action={`/collections/${index===0?(collectionNames.length-1):(((index-1)%collectionNames.length))}`}>⬅️</Button>,
      <Button action={`/collections/${((index+1)%collectionNames.length)}`}>➡️</Button>, 
      <Button.Transaction action='/loading' target="/mint">Pick! ✅</Button.Transaction>, 
      <Button.Reset>Reset</Button.Reset>,
    ],
  })
})

app.transaction('/mint', (c) => {
  const { inputText } = c
  // Send transaction response.
  return c.send({
    chainId: 'eip155:11155111',
    to: '0x3B2330101212e5Ff54338f92B49C3b430CAE81d2',
    value: parseEther(inputText as string),
  })
})

app.frame('/loading', async (c) => {
  const name = 'test'
  return c.res({
    title,
    image: '/pokeball.gif',
    imageAspectRatio: '1:1',
    intents: [
      <Button action={`/mint/${name}`}>next</Button>,
      <Button.Reset>reset test</Button.Reset>,
    ],
  });
});

app.frame('/mint/:name', async (c) => {
  const name = 'test'
  return c.res({
    title,
    image: `/${name}.png`,
    imageAspectRatio: '1:1',
    intents: [
      <Button action={`/`}>Share</Button>,
      <Button.Reset>Play Again</Button.Reset>,
    ],
  })
})

// app.frame('/dbtest', async (c) => {
//   const data = await dbapi.getRandomCreatorAndArtCollection() as any
  
//   return c.res({
//     title,
//     image: (
//       <Box
//       grow
//       alignHorizontal="center"
//       backgroundColor="background"
//       padding="32"
//     >
//       <VStack gap="4">
//         <Heading>FrogUI 🐸</Heading>
//         <Text color="text200" size="20">
//           {data.randomArtCollectionId}
//         </Text>
//       </VStack>
//     </Box>
//     ),
//     imageAspectRatio: '1:1',
//     intents: [
//       <Button action='/'>back</Button>,
//       <Button action='/collections/0'>go collections</Button>,
//       <Button action='/verifications'>verify</Button>,
//       <Button.Reset>reset test</Button.Reset>,
//     ],
//   })
// })

// app.route('/collections', collectionsApp);
// app.route('/verifications', verificationsApp);

if (process.env.NODE_ENV !== 'production') {
  devtools(app, { serveStatic });
}

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 5173 });

console.log(`Server started: ${new Date()} `);

export const GET = handle(app)
export const POST = handle(app)
