import {apiSlice} from "../api/apiSlice";
import {messagesApi} from "../messages/messagesApi";
import socket from "../socket";

export const conversationsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getConversations: builder.query({
            query: (email) => `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=1&_limit=${process.env.REACT_APP_CONVERSATIONS_PER_PAGE}`,
            transformResponse(apiResponse, meta) {
                const totalCount = meta.response.headers.get("X-Total-Count");
                return {data: apiResponse, totalCount};
            },
            async onCacheEntryAdded(arg, {updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch}) {
                try {
                    await cacheDataLoaded;
                    socket.on("conversation", (data) => {
                        updateCachedData((draft) => {
                            const conversation = draft.data.find((c) => c.id == data?.data?.id);
                            if (conversation?.id) {
                                conversation.message = data?.data?.message;
                                conversation.timestamp = data?.data?.timestamp;
                            } else {
                                const participants = data.data.participants.split("-");
                                if(participants.includes(arg) && data.data.users[0].email !== arg) {
                                    draft.data.unshift(data.data);
                                }
                            }
                        });
                    });

                    socket.on("message", (data) => {
                        dispatch(
                            apiSlice.util.updateQueryData(
                                "getMessages",
                                data.data.conversationId.toString(),
                                (draft) => {
                                    const messageFound = draft.data.findIndex((m) => m.conversationId == data.data.conversationId );
                                    if (messageFound !== -1)
                                        draft.data.push(data?.data);
                                }
                            )
                        );
                    });
                } catch (err) {
                    console.log(err);
                }

                await cacheEntryRemoved;
                socket.close();
            },
        }),
        getMoreConversations: builder.query({
            query: ({ email, page }) => `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=${page}&_limit=${process.env.REACT_APP_CONVERSATIONS_PER_PAGE}`,
            async onQueryStarted({email}, {queryFulfilled, dispatch}) {
                try {
                    const conversations = await queryFulfilled;
                    if (conversations?.data?.length > 0) {
                        // update conversation cache pessimistically start
                        dispatch(
                            apiSlice.util.updateQueryData(
                                "getConversations",
                                email,
                                (draft) => {
                                    return {
                                        data: [
                                            ...draft.data,
                                            ...conversations.data,
                                        ],
                                        totalCount: Number(draft.totalCount),
                                    };
                                }
                            )
                        );
                        // update messages cache pessimistically end
                    }
                } catch (err) {
                }
            },
        }),
        getConversation: builder.query({
            query: ({ userEmail,participantEmail }) => `/conversations?participants_like=${userEmail}-${participantEmail}&&participants_like=${participantEmail}-${userEmail}`,
        }),
        addConversation: builder.mutation({
            query: ({sender, data}) => ({
                url: "/conversations",
                method: "POST",
                body: data,
            }),
            async onQueryStarted(arg, {queryFulfilled, dispatch}) {
                try {
                    const conversation = await queryFulfilled;
                    if (conversation?.data?.id) {
                        dispatch(
                            apiSlice.util.updateQueryData(
                                "getConversations",
                                arg.sender,
                                (draft) => {
                                    const foundConversation = draft.data.findIndex((c) => c.id == conversation?.data?.id);
                                    if (foundConversation === -1) {
                                        draft.data.unshift(conversation?.data);
                                    }
                                }
                            )
                        );

                        dispatch(
                            apiSlice.util.updateQueryData(
                                "getConversation",
                                {
                                    participantEmail: conversation?.data?.users[1].email,
                                    userEmail: arg.sender,
                                },
                                (draft) => {
                                    draft.push(conversation?.data);
                                }
                            )
                        );

                        // silent entry to message table
                        const users = arg.data.users;
                        const senderUser = users.find(
                            (user) => user.email === arg.sender
                        );
                        const receiverUser = users.find(
                            (user) => user.email !== arg.sender
                        );

                        dispatch(
                            messagesApi.endpoints.addMessage.initiate({
                                conversationId: conversation?.data?.id,
                                sender: senderUser,
                                receiver: receiverUser,
                                message: arg.data.message,
                                timestamp: arg.data.timestamp,
                            })
                        );
                    }
                } catch (err) {
                    console.log(err);
                }
            },
        }),
        editConversation: builder.mutation({
            query: ({id, data, sender}) => ({
                url: `/conversations/${id}`,
                method: "PATCH",
                body: data,
            }),
            async onQueryStarted(arg, {queryFulfilled, dispatch}) {
                // optimistic cache update start
                const pathResult = dispatch(
                    apiSlice.util.updateQueryData(
                        "getConversations",
                        arg.sender,
                        (draft) => {
                            const draftConversation = draft.data.find(
                                (c) => c.id == arg.id
                            );
                            draftConversation.message = arg.data.message;
                            draftConversation.timestamp = arg.data.timestamp;
                        }
                    )
                );
                // optimistic cache update end

                try {
                    const conversation = await queryFulfilled;
                    if (conversation?.data?.id) {
                        // silent entry to message table
                        const users = arg.data.users;
                        const senderUser = users.find(
                            (user) => user.email === arg.sender
                        );
                        const receiverUser = users.find(
                            (user) => user.email !== arg.sender
                        );
                        // const res = await
                        dispatch(
                            messagesApi.endpoints.addMessage.initiate({
                                conversationId: conversation?.data?.id,
                                sender: senderUser,
                                receiver: receiverUser,
                                message: arg.data.message,
                                timestamp: arg.data.timestamp,
                            })
                        );
                        // .unwrap();
                        // update messages cache pessimistically start
                        /*dispatch(
                            apiSlice.util.updateQueryData(
                                "getMessages",
                                res.conversationId.toString(),
                                (draft) => {
                                    /!*
                                    * Need to check duplicate message,
                                    * because socket event fire before
                                    * pessimistic cache update event
                                    * *!/
                                    const foundMsg = draft.data.findIndex((msg) => msg.id === res?.id);
                                    if (foundMsg === -1)
                                        draft.data.push(res);
                                }
                            )
                        );*/
                        // update messages cache pessimistically end
                    }
                } catch (err) {
                    pathResult.undo();
                }
            },
        }),
    }),
});

export const {
    useGetConversationsQuery,
    useGetConversationQuery,
    useAddConversationMutation,
    useEditConversationMutation,
} = conversationsApi;
