//DOM Elements
const containerChat = document.querySelector('.container_chat')
const chatDisplay = document.querySelector('.chat_view')
const chatBox = document.querySelector('.text_to_chat')
const chatTextArea = document.querySelector('#chat_textarea')
//? DOM Buttons
const googleLoginButton = document.querySelector('#google_login')
const logoutButton = document.querySelector('#logout')
//? Utilidades Firebase
const auth = firebase.auth()
const db = firebase.firestore()
const provider = new firebase.auth.GoogleAuthProvider();
const clientUser = {
    username: "",
    photo: "",
    uid: ""
}
//? Booleanos
let isLogedIn = false
let isBanned = false
//! Authentication
const SignInGoogle = () => {
    auth.signInWithPopup(provider)
    .then(result => {
        let user = result.user
        clientUser.username = user.displayName;
        clientUser.photo = user.photoURL;
        clientUser.uid = user.uid
        isLogedIn = true
        chatTextArea.disabled = false;
        chatTextArea.value = " ";
    })
    .catch(e => {console.error(e)})
}

const Logout = () => auth.signOut().then(() => chatTextArea.disabled = true)
googleLoginButton.onclick = () => SignInGoogle();
logoutButton.onclick = () => Logout();

//! Usuarios baneados
const dontAllowBanned = () => {
    const bannedRef = db.collection("baneados")
    bannedRef.onSnapshot(query => {
        query.docs.forEach(item => {
            if (item.id === clientUser.uid) {
                isBanned = true;
                chatTextArea.disabled = true
                alert("Tu no estas capacitado para hablar aqui")
            }
        })
    })
}

//!Crear Mensajes
const createMsgInFirestore = (message, clientUser) => {
    const messagesRef = db.collection("mensajes")
    const bannedRef = db.collection("baneados")

    if (bannedWordsInText(message)) {
        messagesRef.add({
            msg:"Este usuario esta baneado por decir malas cosas",
            nameUser:clientUser.username,
            uid:clientUser.uid,
            photoURL:clientUser.photo,
            created: firebase.firestore.FieldValue.serverTimestamp()
        })
        bannedRef.doc(clientUser.uid).set({})
    } else {
        messagesRef.add({
            msg:message,
            nameUser:clientUser.username,
            uid:clientUser.uid,
            photoURL:clientUser.photo,
            created: firebase.firestore.FieldValue.serverTimestamp()
        })
    }
}

const transformMsg = (photoUrl,message) => {
    return `
        <div class="conversation_buble">
            <div class="head_buble">
                <img src="${photoUrl}" alt="userImage" class="buble_img"/>
            </div>
            <div class="message_buble">
                <p>${message}</p>
            </div>
        </div>
    `
};

const addMsgToDOM = (div, message) => div.innerHTML+=message

chatBox.onsubmit = e => {
    e.preventDefault()
    if (isLogedIn && !isBanned) {
        createMsgInFirestore(chatTextArea.value, clientUser)
        chatTextArea.value = ""
    } else {
        return false
    }
}

chatTextArea.onkeyup = e => {
    e.preventDefault()
    if (e.keyCode === 13 && isLogedIn && !isBanned) {
        createMsgInFirestore(chatTextArea.value, clientUser)
        chatTextArea.value = ""
    }
}

//! Mostrar Datos de Firestore
const getDataFromFirestore = () => {
    const messagesRef = db.collection("mensajes")
    messagesRef.orderBy("created").limit(20)
        .onSnapshot(querySnapshot => {
            let changes = querySnapshot.docChanges();
            changes.forEach(change => {
                if(change.type === "added") {
                    const collectionData = change.doc.data()
                    const message = transformMsg(collectionData.photoURL, collectionData.msg)
                    addMsgToDOM(chatDisplay, message)
                }
            })
        })
}


//!Regex
const bannedWords = ["tomate"]
const banned = (words) => (text) => {
    const wordsSum = words.reduce((item, acc) => `(${item}|${acc})`)
    const rgxWords = new RegExp(wordsSum, "gi")
    return rgxWords.test(text)
}

let bannedWordsInText = banned(bannedWords)
console.log(bannedWordsInText("el tomate esta seco"))

//! General
window.onload = () => {
    getDataFromFirestore();
    if (!isLogedIn) {
        chatTextArea.disabled = true;
        chatTextArea.value = "Ingrese para hablar con los demas";
    }
}