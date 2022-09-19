import {apiSlice} from "../api/apiSlice";
import socket from "../socket";

export const messagesApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getMessages: builder.query({
            query: (id) => `/messages?conversationId=${id}&_sort=timestamp&_order=desc&_page=1&_limit=${process.env.REACT_APP_MESSAGES_PER_PAGE}`,
            transformResponse(apiResponse, meta) {
                const totalCount = meta.response.headers.get("X-Total-Count");
                return { data: apiResponse, totalCount };
            },
            async onCacheEntryAdded(
                arg,
                {updateCachedData, cacheDataLoaded, cacheEntryRemoved}
            ) {
                try {
                    await cacheDataLoaded;
                    /*socket.on("message", (data) => {
                        // console.log("message",data)
                        // console.log(arg, data.data.conversationId)
                        updateCachedData((draft) => {
                            /!*
                            * Need to check duplicate message,
                            * because socket event fire before
                            * pessimistic cache update event
                            * *!/
                            // const foundMsg = draft.data.findIndex((msg) => msg.timestamp === data?.data?.timestamp);
                            // if (foundMsg === -1) {
                                if(data.data.conversationId === +arg && draft.data[0]?.sender?.email !== data?.data?.sender?.email) {
                                    console.log("not matched")
                                    draft.data.push(data?.data);
                                } else {
                                    console.log("matched")
                                }
                            // }
                        });
                    });*/
                } catch (err) {
                    console.log(err);
                }

                await cacheEntryRemoved;
                socket.close();
            },
        }),
        getMoreMessages: builder.query({
            query: ({ id, page }) => `/messages?conversationId=${id}&_sort=timestamp&_order=desc&_page=${page}&_limit=${process.env.REACT_APP_MESSAGES_PER_PAGE}`,
            async onQueryStarted({id}, {queryFulfilled, dispatch}) {
                try {
                    const messages = await queryFulfilled;
                    if (messages?.data?.length > 0) {
                        // update conversation cache pessimistically start
                        dispatch(
                            apiSlice.util.updateQueryData(
                                "getMessages",
                                id,
                                (draft) => {
                                    return {
                                        data: [
                                            ...draft.data,
                                            ...messages.data,
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
        addMessage: builder.mutation({
            query: (data) => ({
                url: "/messages",
                method: "POST",
                body: data,
            }),
            /* May be useless, because we update message in addConversation, editConversation */
            async onQueryStarted(arg, {queryFulfilled, dispatch}) {
                try {
                    const message = await queryFulfilled;
                    if (message?.data?.id) {
                        dispatch(
                            apiSlice.util.updateQueryData(
                                "getMessages",
                                message?.data?.id,
                                (draft) => {
                                    draft.data.push(message?.data);
                                }
                            )
                        );
                    }                } catch (err) {
                    console.log(err);
                }
            },
        }),
    }),
});

export const {useGetMessagesQuery, useAddMessageMutation} = messagesApi;
