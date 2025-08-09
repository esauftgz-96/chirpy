export function filterWords(rawString:string) : string {
    let flaggedWords = ["kerfuffle", "sharbert", "fornax"];
    let stringA = rawString.split(" ");
    let stringB = [];
    for (let word of stringA) {
        if (flaggedWords.includes(word.toLowerCase())) {
            word = "****";
        }
        stringB.push(word);
    }
    return stringB.join(" ");
}