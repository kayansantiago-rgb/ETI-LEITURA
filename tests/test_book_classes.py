import pytest
from fastapi import HTTPException
from backend.server import book_visible_query, clean_book_classes

TEACHER = {'id': 't', 'role': 'teacher', 'turmas': ['7º ANO', '8º ANO']}


def test_students_only_see_books_open_to_all_or_to_their_class():
    query = book_visible_query({'id': 's', 'role': 'student', 'turma': '7º ANO'})
    assert {'turmas': '7º ANO'} in query['$or'] and {'turmas': []} in query['$or']
    assert book_visible_query({'id': 'a', 'role': 'admin'}) == {}


def test_teacher_sees_own_books_and_their_classes():
    query = book_visible_query(TEACHER)
    assert {'professor_id': 't'} in query['$or']
    assert {'turmas': {'$in': ['7º ANO', '8º ANO']}} in query['$or']


def test_teacher_must_choose_own_classes():
    assert clean_book_classes(['8º ANO', '7º ANO', 'X'], TEACHER) == ['7º ANO', '8º ANO']
    with pytest.raises(HTTPException):
        clean_book_classes([], TEACHER)
    with pytest.raises(HTTPException):
        clean_book_classes(['9º ANO'], TEACHER)
    assert clean_book_classes([], {'id': 'a', 'role': 'admin'}) == []
