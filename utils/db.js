const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

module.exports.submitSignature = (user_id, signature) => {
    const q = `
    INSERT INTO signatures (user_id, signature)
    VALUES ($1, $2)
    RETURNING id;
    `;
    const params = [user_id, signature];
    return db.query(q, params);
};

module.exports.getSigners = () => {
    const q = `
    SELECT first, last, signed_at, age, city, url
    FROM users
    JOIN signatures
    ON users.id = signatures.user_id
    LEFT JOIN profiles
    ON users.id = profiles.user_id;
    `;
    return db.query(q);
};

module.exports.getSignersByCity = city => {
    const q = `
    SELECT first, last, signed_at, age, city, url
    FROM users
    JOIN signatures
    ON users.id = signatures.user_id
    JOIN profiles
    ON users.id = profiles.user_id AND profiles.city = $1
    ;
    `;
    const params = [city];
    return db.query(q, params);
};

module.exports.getSignature = userId => {
    const q = `
    SELECT signature, id FROM signatures
    WHERE user_id = $1;
    `;
    const params = [userId];
    return db.query(q, params);
};

module.exports.insertNewUser = (first, last, email, pass) => {
    const q = `
    INSERT INTO users (first, last, email, pass)
    VALUES ($1, $2, $3, $4)
    RETURNING id;
    `;
    const params = [first, last, email, pass];
    return db.query(q, params);
};

module.exports.submitProfile = (age, city, url, user_id) => {
    let num = Number(age);
    if (num == 0) {
        num = null;
    }
    const q = `
    INSERT INTO profiles (age, city, url, user_id)
    VALUES (${num}, $1, $2, $3);
    `;
    const params = [city, url, user_id];
    return db.query(q, params);
};

module.exports.getProfile = userId => {
    const q = `
    SELECT first, last, email, age, city, url
    FROM users
    JOIN profiles
    ON users.id = profiles.user_id
    WHERE users.id = $1;
    `;
    const params = [userId];
    return db.query(q, params);
};

module.exports.updateUser = (first, last, email, pass, userId) => {
    const q = `
    UPDATE users
    SET first=$1, last=$2, email=$3, pass=$4
    WHERE id = $5
    ;
    `;
    const params = [first, last, email, pass, userId];
    return db.query(q, params);
};

module.exports.updateUserNoPw = (first, last, email, userId) => {
    const q = `
    UPDATE users
    SET first=$1, last=$2, email=$3
    WHERE id = $4
    ;
    `;
    const params = [first, last, email, userId];
    return db.query(q, params);
};

module.exports.updateProfile = (age, city, url, user_id) => {
    let num = Number(age);
    // console.log("NUM", num);
    if (num == 0) {
        num = null;
    }
    const q = `
    INSERT INTO profiles (age, city, url, user_id)
    VALUES (${num}, $1, $2, $3)
    ON CONFLICT (user_id)
    DO UPDATE SET age=${num}, city=$1, url=$2;
    `;
    const params = [city, url, user_id];
    return db.query(q, params);
};

module.exports.getHashedPw = email => {
    const q = `
    SELECT pass, id FROM users
    WHERE email = $1;
    `;
    const params = [email];
    return db.query(q, params);
};

module.exports.deleteSign = userId => {
    const q = `
    DELETE FROM signatures
    WHERE user_id = $1;
    `;
    const params = [userId];
    return db.query(q, params);
};
