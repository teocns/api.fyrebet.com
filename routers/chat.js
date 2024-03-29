const { Validator } = require('node-input-validator'); // Input validation

const { generate: generateGuid, validate: validateGuid } = require("../helpers/guid");

const userActions = require("../actions/session");
const chatActions = require("../actions/chat");
const ChatDbo = require("../dbo/chat");
const UserDbo = require("../dbo/user");

const Errors = require("../constants/errors");
const outputError = require("../helpers/error");
const sharp = require('sharp');
const { db, escape } = require('../db');
const dispatcher = require('../dispatcher');
const sessionStore = require('../store/session');
const io = require("../socket");

const ActionTypes = require("../constants/ActionTypes")
const handlers = [
    ['get', "/find-private-chat-room", async (req, res) => {
        let authenticationToken = undefined;
        let user = undefined;

        try {
            if (!('x-authentication-token' in req.headers) || !(authenticationToken = req.headers['x-authentication-token']) || !(user = await UserDbo.getUserByToken(authenticationToken))) {
                return res.send(outputError(Errors.ERR_UNAUTHENTICATED)).status(404);

            }
            const targetUserUUID = req.query.userUUID;
            let targetUser = undefined;
            if (!(uuid = validateGuid(targetUserUUID)) || user.UUID === targetUserUUID || !(targetUser = await UserDbo.getUserByUUID(targetUserUUID))) throw Errors.ERR_NO_ACCESS_TO_CONVERSATION;
            const { wasCreated, chatRoomUUID } = await ChatDbo.getPrivateChatRoom(user.UUID, targetUserUUID);
            if (wasCreated) {
                // Add other party to the socket room
                const targetUserId = targetUser.id;
                const targetSession = sessionStore.getByUserId(targetUserId);
                if (targetSession) {
                    dispatcher.dispatch({
                        actionType: ActionTypes.CHAT_ADD_SESSION_TO_ROOM,
                        data: {
                            chatRoomUUID,
                            sessionId
                        }
                    })
                }

            }
            return res.send({
                chatRoomUUID
            });

        }
        catch (Err) {
            console.log(Err)
            return res.send(outputError(Err));

        }

    }],
    ['get', "/getchat", async (req, res) => {
        res.send(await ChatDbo.getChatRoom({
            chatRoomUUID: '',
            requestingUserId: 80
        }));

    }],

    ['get', "/test123", async (req, res) => {
        res.send(await ChatDbo.getChatRoom({ chatRoomUUID: 'EN' }));

    }],
    ['get', "/chatSearchQuery", async (req, res) => {
        let authenticationToken = undefined;
        let userId = undefined;
        if (!('x-authentication-token' in req.headers) || 
        !(authenticationToken = req.headers['x-authentication-token']) || 
        !(userId = await UserDbo.getIdByAuthenticationToken(authenticationToken))) {
            return res.send(outputError(Errors.ERR_UNAUTHENTICATED)).status(404);
        }
        // Short validation
        let query = (req.query.query || '').trim();
        if (!query){

            // Do nothing. Just never respond to the client
        }
        try{
            res.send(await ChatDbo.chatSearchQuery({ query, userId  }));
        }
        catch(e){
            console.log(e)
            res.send(outputError(e))
        }

    }],
    ['get', "/userChats", async (req, res) => {
        let authenticationToken = undefined;
        let user = undefined;
        if (!('x-authentication-token' in req.headers) || !(authenticationToken = req.headers['x-authentication-token']) || !(user = await UserDbo.getUserByToken(authenticationToken))) {
            return res.send(outputError(Errors.ERR_UNAUTHENTICATED)).status(404);
        }
        
        const skip = req.query.s;
        const limit = req.query.l ;
        try{
            res.send(await chatActions.getUserChats({userId, skip, limit}));
        }
        catch(e){
            console.log(e)
            res.send(outputError(e))
        }

    }],

]


module.exports = handlers;