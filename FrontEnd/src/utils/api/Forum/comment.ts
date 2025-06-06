import { requestAPI } from "../request";
import { getApiUrl } from '../../../config/env';

const BASE_URL = getApiUrl('/forum');

async function getComments(id: string) {
    const response = await requestAPI(BASE_URL, `/posts/${id}/comments`, "GET");
    return response;
}

async function createComment(id: string, comment: any) {
    const response = await requestAPI(BASE_URL, `/posts/${id}/comments`, "POST", comment);
    return response;
}   

async function updateComment(commentId: string, comment: any) {
    const response = await requestAPI(BASE_URL, `/comments/${commentId}`, "PUT", comment);
    return response;
}

async function deleteComment(commentId: string) {
    const response = await requestAPI(BASE_URL, `/comments/${commentId}`, "DELETE");
    return response;
}

export default {
    getComments,
    createComment,
    updateComment,
    deleteComment
};
