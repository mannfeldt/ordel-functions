//import firebase functions modules
const functions = require("firebase-functions");
//import admin module
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

exports.nextTurnPush = functions.firestore
  .document("multiplayer_games/{gameId}")
  .onUpdate((change, context) => {
    const newPlayer = change.after.data().currentPlayer;

    const previousPlayer = change.before.data().currentPlayer;

    if (newPlayer === previousPlayer) {
      return null;
    }

    var db = admin.firestore();

    return db
      .collection("users")
      .doc(newPlayer)
      .get()
      .then((snapshot) => {
        const newPlayerFcm = snapshot.data().fcm;

        const payload = {
          notification: {
            title: "Its your turn to play",
            body: "click here to jump into the action",
            sound: "default",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          data: {
            push_func: "nextTurnPush",
            game: change.after.data().id,
          },
        };

        const options = {
          priority: "high",
          timeToLive: 60 * 60 * 24,
        };
        return admin.messaging().sendToDevice(newPlayerFcm, payload, options);
      });
  });

exports.gameFinishedPush = functions.https.onCall((data, context) => {
  const targetFcm = data.target;
  const gameId = data.game_id;

  const payload = {
    notification: {
      title: "Game finished!",
      body: "Click here to se result!",
      sound: "default",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    data: {
      push_func: "gameFinishedPush",
      game: gameId,
    },
  };
  console.log("---------VERSION_1-------------");

  const options = {
    priority: "high",
    timeToLive: 60 * 60 * 2,
  };
  return admin.messaging().sendToDevice(targetFcm, payload, options);
});

exports.newFollowerPush = functions.https.onCall((data, context) => {
  //kanske lägga till koll på att bara skicka push om användaren inte redan har den personen som vänn? eller iaf särskilja de fallen med olika meddelanden

  const userFcm = data.userFcm;
  const followerName = data.followerName;
  const followerUid = data.followerUid;

  const payload = {
    notification: {
      title: followerName + " just added you as friend",
      body: "Why dont you invite them to a game?",
      sound: "default",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    data: {
      push_func: "newFollowerPush",
      follower: followerUid,
      name: followerName,
    },
  };

  const options = {
    priority: "high",
    timeToLive: 60 * 60 * 1,
  };
  return admin.messaging().sendToDevice(userFcm, payload, options);
});

exports.newGameInvitePush = functions.https.onCall((data, context) => {
  const invitedFcm = data.invited_fcm;
  const hostName = data.host_name;
  const gameId = data.game_id;

  const payload = {
    notification: {
      title: "New game invite!",
      body: hostName + " has invited you to play a game",
      sound: "default",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    data: {
      push_func: "newGameInvitePush",
      game: gameId,
      name: hostName,
    },
  };
  console.log("---------VERSION_1-------------");

  const options = {
    priority: "high",
    timeToLive: 60 * 60 * 2,
  };
  return admin.messaging().sendToDevice(invitedFcm, payload, options);
});

exports.acceptedGameInvitePush = functions.https.onCall((data, context) => {
  const acceptedName = data.accepted_name;
  const hostUid = data.host_uid;
  const hostFcm = data.host_fcm;
  const gamePlayerCount = data.game_player_count;
  const gameUnansweredCount = data.game_unanswered_count;
  const gameId = data.game_id;

  const payload = {
    notification: {
      title: acceptedName + " accepted your game invite",
      body:
        gameUnansweredCount === 0
          ? "Everyone was now answered your invite. Lets start the game?"
          : gamePlayerCount +
            " players are ready to play. Waiting to hear from " +
            gameUnansweredCount +
            " more",
      sound: "default",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    data: {
      push_func: "acceptedGameInvitePush",
      game: gameId,
      name: acceptedName,
    },
  };

  const options = {
    priority: "high",
    timeToLive: 60 * 60 * 1,
  };

  if (hostFcm) {
    return admin.messaging().sendToDevice(hostFcm, payload, options);
  }

  var db = admin.firestore();

  return db
    .collection("users")
    .doc(hostUid)
    .get()
    .then((snapshot) => {
      const hostUser = snapshot.data();

      return admin.messaging().sendToDevice(hostUser.fcm, payload, options);
    });
});

exports.declinedGameInvitePush = functions.https.onCall((data, context) => {
  const declinedName = data.declined_name;
  const hostUid = data.host_uid;
  const hostFcm = data.host_fcm;
  const gamePlayerCount = data.game_player_count;
  const gameUnansweredCount = data.game_unanswered_count;
  const gameId = data.game_id;

  const payload = {
    notification: {
      title: declinedName + " declined your game invite",
      body:
        gameUnansweredCount === 0
          ? "Everyone was now answered your invite. Lets start the game?"
          : gamePlayerCount -
            1 +
            " has accepted. Waiting to hear from " +
            gameUnansweredCount +
            " more",
      sound: "default",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    data: {
      push_func: "declinedGameInvitePush",
      game: gameId,
      name: declinedName,
    },
  };

  const options = {
    priority: "high",
    timeToLive: 60 * 60 * 1,
  };

  if (hostFcm) {
    return admin.messaging().sendToDevice(hostFcm, payload, options);
  }

  var db = admin.firestore();

  return db
    .collection("users")
    .doc(hostUid)
    .get()
    .then((snapshot) => {
      const hostUser = snapshot.data();

      return admin.messaging().sendToDevice(hostUser.fcm, payload, options);
    });
});
exports.declinedGameInviteDeletePush = functions.https.onCall(
  (data, context) => {
    const declinedName = data.declined_name;
    const hostUid = data.host_uid;
    const hostFcm = data.host_fcm;
    const gameId = data.game_id;

    const payload = {
      notification: {
        title: declinedName + " declined your game invite",
        body: "Game was removed as there is not enough players",
        sound: "default",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      data: {
        push_func: "declinedGameInviteDeletePush",
        game: gameId,
        name: declinedName,
      },
    };

    const options = {
      priority: "high",
      timeToLive: 60 * 60 * 1,
    };

    if (hostFcm) {
      return admin.messaging().sendToDevice(hostFcm, payload, options);
    }

    var db = admin.firestore();

    return db
      .collection("users")
      .doc(hostUid)
      .get()
      .then((snapshot) => {
        const hostUser = snapshot.data();

        return admin.messaging().sendToDevice(hostUser.fcm, payload, options);
      });
  }
);
