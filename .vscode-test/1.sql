-- DDD
-- exec HS_POST_BATCH0;
-- SELECT * from TFUNDINFO t;
-- SELECT * from TAGENCYINFO t where t.C_BYFUNDMETHOD='101';
-- INSERT INTO tfundinfo (C_FUNDCODE) VALUES ('231314');

-- SELECT * FROM tfundinfo t WHERE t.c_fundcode = '125010';
SELECT * FROM tfundinfo;


-- @block
SELECT * FROM TFUNDINFO;



-- @block
         insert into tfundinfo (c_fundcode) VALUES ('133129');
         commit;

-- @block
BEGIN
         DBMS_OUTPUT.PUT_LINE('Hello, Oracle6!');
         DBMS_OUTPUT.PUT_LINE('Hello, Oracle2!');
         DBMS_OUTPUT.PUT_LINE('Hello, Oracle3!');
        --  insert into tfundinfo (c_fundcode) VALUES ('123335');
        --  commit;
         DBMS_OUTPUT.PUT_LINE('Hello, Node!');
END;




